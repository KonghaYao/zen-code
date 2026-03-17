use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span, Text},
    widgets::{
        Block, Borders, Paragraph, Scrollbar, ScrollbarOrientation, ScrollbarState, Wrap,
    },
    Frame,
};

use rust_create_agent::messages::BaseMessage;
use crate::app::App;

pub fn render_markdown(content: &str) -> Vec<Line<'static>> {
    let text = tui_markdown::from_str(content);
    text.lines.into_iter().map(|line| {
        Line::from(
            line.spans.into_iter()
                .map(|s| Span::styled(s.content.into_owned(), s.style))
                .collect::<Vec<_>>()
        )
    }).collect()
}

pub fn render(f: &mut Frame, app: &mut App) {
    let area = f.area();

    // 动态输入框高度：行数 + 边框（上下各 1），最少 3 行，最多 40%
    let line_count = app.textarea.lines().len() as u16;
    let input_height = (line_count + 2).min(area.height * 2 / 5).max(3);

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1),            // 标题栏
            Constraint::Min(3),               // 聊天区
            Constraint::Length(input_height), // 输入框（动态）
            Constraint::Length(1),            // 帮助栏
        ])
        .split(area);

    render_title(f, app, chunks[0]);
    render_messages(f, app, chunks[1]);
    f.render_widget(&app.textarea, chunks[2]);
    render_help(f, app, chunks[3]);
}

fn render_title(f: &mut Frame, app: &App, area: Rect) {
    let subtitle = format!(
        "  —  {} · {} | FilesystemMiddleware + TerminalMiddleware",
        app.provider_name, app.model_name
    );
    let title = Paragraph::new(
        Line::from(vec![
            Span::styled(" 🦀 ", Style::default().fg(Color::Red)),
            Span::styled("Rust Agent TUI", Style::default()
                .fg(Color::Cyan)
                .add_modifier(Modifier::BOLD)),
            Span::styled(subtitle, Style::default().fg(Color::DarkGray)),
        ])
    )
    .style(Style::default().bg(Color::Black));
    f.render_widget(title, area);
}

fn render_messages(f: &mut Frame, app: &mut App, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::DarkGray))
        .title(Span::styled(
            " 对话 ",
            Style::default().fg(Color::White).add_modifier(Modifier::BOLD),
        ));

    let inner = block.inner(area);
    f.render_widget(block, area);

    // 右侧留 1 列给滚动条
    let inner_width = inner.width.saturating_sub(1) as usize;
    let mut all_lines: Vec<Line> = Vec::new();

    for msg in &app.messages {
        let is_conversational = matches!(msg.inner, BaseMessage::Human { .. } | BaseMessage::Ai { .. });
        if is_conversational {
            all_lines.push(Line::from(""));
        }
        all_lines.extend(message_to_lines(msg, inner_width));
        if is_conversational {
            all_lines.push(Line::from(""));
        }
    }

    // 计算每条 Line 经过自动换行后的实际视觉行数
    let visual_total: u16 = all_lines.iter().map(|l| visual_rows(l, inner_width)).sum();
    let visible_height = inner.height;

    let max_scroll = visual_total.saturating_sub(visible_height);
    // 计算本帧实际偏移，并写回 scroll_offset 保持同步
    let offset = if app.scroll_follow {
        max_scroll
    } else {
        app.scroll_offset.min(max_scroll)
    };
    app.scroll_offset = offset;

    // 文字区域（留出右侧 1 列给滚动条）
    let text_area = Rect {
        width: inner.width.saturating_sub(1),
        ..inner
    };
    let paragraph = Paragraph::new(Text::from(all_lines))
        .scroll((offset, 0))
        .wrap(Wrap { trim: false });
    f.render_widget(paragraph, text_area);

    // 滚动条
    if visual_total > visible_height {
        let mut scrollbar_state = ScrollbarState::new(max_scroll as usize)
            .position(offset as usize);
        let scrollbar = Scrollbar::new(ScrollbarOrientation::VerticalRight)
            .style(Style::default().fg(Color::DarkGray));
        f.render_stateful_widget(scrollbar, inner, &mut scrollbar_state);
    }
}

fn message_to_lines(msg: &crate::app::ChatMessage, _width: usize) -> Vec<Line<'static>> {
    let mut lines = Vec::new();
    let content = msg.content();

    match &msg.inner {
        BaseMessage::Human { .. } => {
            lines.push(Line::from(vec![
                Span::styled("▶ 你  ", Style::default().fg(Color::Green).add_modifier(Modifier::BOLD)),
                Span::styled(content, Style::default().fg(Color::White)),
            ]));
        }
        BaseMessage::Ai { .. } => {
            lines.push(Line::from(vec![
                Span::styled("◆ Agent  ", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD)),
            ]));
            let md_lines = msg.rendered_md.as_deref()
                .map(|l| l.to_vec())
                .unwrap_or_else(|| render_markdown(&content));
            for md_line in md_lines {
                let mut indented = md_line;
                indented.spans.insert(0, Span::raw("  "));
                lines.push(indented);
            }
        }
        BaseMessage::Tool { is_error, .. } => {
            let name = msg.display_name.as_deref().unwrap_or("tool").to_string();
            let (icon, color) = if *is_error {
                ("✗", Color::Red)
            } else {
                let raw = msg.tool_name.as_deref().unwrap_or(&name);
                ("⚙", tool_color(raw))
            };
            lines.push(Line::from(vec![
                Span::styled(format!("{} {}", icon, name), Style::default().fg(color).add_modifier(Modifier::BOLD)),
            ]));
            for line in content.lines() {
                lines.push(Line::from(vec![
                    Span::raw("  │ "),
                    Span::styled(line.to_string(), Style::default().fg(Color::DarkGray)),
                ]));
            }
        }
        BaseMessage::System { .. } => {
            lines.push(Line::from(vec![
                Span::styled("ℹ ", Style::default().fg(Color::Blue)),
                Span::styled(content, Style::default().fg(Color::DarkGray)),
            ]));
        }
    }

    lines
}

/// 按工具名分配颜色
fn tool_color(name: &str) -> Color {
    match name {
        "bash"                        => Color::Rgb(255, 165,   0), // 橙
        "read_file"                   => Color::Rgb( 97, 214, 214), // 青
        "write_file"                  => Color::Rgb(105, 240, 174), // 绿
        "edit_file"                   => Color::Rgb(179, 157, 219), // 紫
        "glob_files"                  => Color::Rgb(255, 213,  79), // 黄
        "search_files_rg"             => Color::Rgb(100, 181, 246), // 蓝
        "folder_operations"           => Color::Rgb(240, 128, 128), // 玫红
        _ if name.contains("error")   => Color::Red,
        _                             => Color::Yellow,
    }
}

/// 估算一条 Line 在给定宽度下占用的视觉行数（含自动换行）
fn visual_rows(line: &Line, width: usize) -> u16 {
    if width == 0 { return 1; }
    let char_count: usize = line.spans.iter().map(|s| s.content.chars().count()).sum();
    ((char_count.max(1) + width - 1) / width) as u16
}

fn render_help(f: &mut Frame, app: &App, area: Rect) {
    let line = if app.loading {
        Line::from(vec![
            Span::styled(" ⠿ Agent 运行中", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::styled("  Alt+↑↓", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::styled(":滚动  ", Style::default().fg(Color::DarkGray)),
            Span::styled("Ctrl+C", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::styled(":退出", Style::default().fg(Color::DarkGray)),
        ])
    } else {
        Line::from(vec![
            Span::styled(" Enter", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::styled(":换行  ", Style::default().fg(Color::DarkGray)),
            Span::styled("Ctrl+S", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::styled(":发送  ", Style::default().fg(Color::DarkGray)),
            Span::styled("Esc/Ctrl+C", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::styled(":退出  ", Style::default().fg(Color::DarkGray)),
        ])
    };
    f.render_widget(Paragraph::new(line), area);
}
