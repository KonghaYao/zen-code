use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span, Text},
    widgets::{
        Block, Borders, Clear, Paragraph, Scrollbar, ScrollbarOrientation, ScrollbarState, Wrap,
    },
    Frame,
};

use rust_create_agent::messages::BaseMessage;
use crate::app::App;

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

    // HITL 弹窗（覆盖层）
    if app.hitl_prompt.is_some() {
        render_hitl_popup(f, app);
    }

    // AskUser 弹窗（覆盖层）
    if app.ask_user_prompt.is_some() {
        render_ask_user_popup(f, app);
    }
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
    // 右侧留 1 列给滚动条
    let inner = area;
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
            for text_line in content.lines() {
                lines.push(Line::from(vec![
                    Span::raw("  "),
                    Span::styled(text_line.to_string(), Style::default().fg(Color::White)),
                ]));
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
    let line = if app.ask_user_prompt.is_some() {
        Line::from(vec![
            Span::styled(" Tab", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::styled(":切换问题  ", Style::default().fg(Color::DarkGray)),
            Span::styled("↑↓", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::styled(":移动  ", Style::default().fg(Color::DarkGray)),
            Span::styled("Space", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::styled(":选择  ", Style::default().fg(Color::DarkGray)),
            Span::styled("Enter", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::styled(":确认此题/全部提交", Style::default().fg(Color::DarkGray)),
        ])
    } else if app.hitl_prompt.is_some() {
        Line::from(vec![
            Span::styled(" ↑↓", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::styled(":移动  ", Style::default().fg(Color::DarkGray)),
            Span::styled("Space", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::styled(":切换  ", Style::default().fg(Color::DarkGray)),
            Span::styled("Enter", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::styled(":确认  ", Style::default().fg(Color::DarkGray)),
            Span::styled("y", Style::default().fg(Color::Green).add_modifier(Modifier::BOLD)),
            Span::styled(":全批准  ", Style::default().fg(Color::DarkGray)),
            Span::styled("n", Style::default().fg(Color::Red).add_modifier(Modifier::BOLD)),
            Span::styled(":全拒绝", Style::default().fg(Color::DarkGray)),
        ])
    } else if app.loading {
        Line::from(vec![
            Span::styled(" ⠿ Agent 运行中", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
            Span::styled("  ↑↓", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
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

/// HITL 批量确认弹窗
fn render_hitl_popup(f: &mut Frame, app: &App) {
    let Some(prompt) = &app.hitl_prompt else { return };

    let area = f.area();
    let item_count = prompt.items.len();

    // 弹窗高度：标题(1) + 每项(2行) + 空行(1) + 底部提示(1) + 边框(2)
    let popup_height = ((item_count as u16 * 2) + 5).min(area.height.saturating_sub(4));
    let popup_width = (area.width * 4 / 5).max(55).min(area.width.saturating_sub(4));
    let x = (area.width.saturating_sub(popup_width)) / 2;
    let y = (area.height.saturating_sub(popup_height)) / 2;
    let popup_area = Rect::new(x, y, popup_width, popup_height);

    f.render_widget(Clear, popup_area);

    let title = if item_count == 1 {
        " ⚠ 工具审批 (1 项) "
    } else {
        " ⚠ 批量工具审批 "
    };

    let block = Block::default()
        .title(Span::styled(title, Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::Yellow));
    f.render_widget(&block, popup_area);

    let inner = block.inner(popup_area);
    let max_width = inner.width as usize;

    // 渲染每个工具调用项
    let mut lines: Vec<Line> = Vec::new();

    for (i, (item, &approved)) in prompt.items.iter().zip(prompt.approved.iter()).enumerate() {
        let is_cursor = i == prompt.cursor;

        // 状态图标和颜色
        let (status_icon, status_color) = if approved {
            ("✓", Color::Green)
        } else {
            ("✗", Color::Red)
        };

        // 光标高亮
        let cursor_indicator = if is_cursor { "▶ " } else { "  " };
        let row_style = if is_cursor {
            Style::default().bg(Color::Rgb(40, 40, 60))
        } else {
            Style::default()
        };

        // 工具名行
        lines.push(Line::styled(
            format!(
                "{}{} {}  {}",
                cursor_indicator,
                status_icon,
                item.tool_name,
                if approved { "[批准]" } else { "[拒绝]" }
            ),
            if is_cursor {
                Style::default().fg(status_color).bg(Color::Rgb(40, 40, 60)).add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(status_color)
            },
        ));

        // 参数预览行
        let input_preview = format_input_preview(&item.input, max_width.saturating_sub(6));
        lines.push(Line::from(vec![
            Span::raw("     "),
            Span::styled(input_preview, row_style.fg(Color::DarkGray)),
        ]));
    }

    lines.push(Line::from(""));

    // 底部提示（仅多项时显示"按 Enter 按当前设置确认"）
    if item_count > 1 {
        lines.push(Line::from(vec![
            Span::styled(
                format!("已选: {} 批准 / {} 拒绝",
                    prompt.approved.iter().filter(|&&v| v).count(),
                    prompt.approved.iter().filter(|&&v| !v).count()
                ),
                Style::default().fg(Color::DarkGray),
            ),
        ]));
    }

    let para = Paragraph::new(Text::from(lines));
    f.render_widget(para, inner);
}

/// AskUser 批量弹窗：header tab 行 + 当前问题选项
fn render_ask_user_popup(f: &mut Frame, app: &App) {
    let Some(prompt) = &app.ask_user_prompt else { return };

    let area = f.area();
    let popup_width = (area.width * 8 / 10).max(54).min(area.width.saturating_sub(4));

    // 当前问题的行数
    let cur = &prompt.questions[prompt.active_tab];
    let option_rows = cur.data.options.len() as u16;
    let extra_rows = if cur.data.allow_custom_input { 2u16 } else { 0 };
    // 1 header + 1 空行 + 描述行 + 空行 + 选项 + extra + 边框(2)
    let desc_rows = cur.data.description.lines().count() as u16;
    let popup_height = (1 + 1 + desc_rows + 1 + option_rows + extra_rows + 2)
        .min(area.height.saturating_sub(2));

    let x = (area.width.saturating_sub(popup_width)) / 2;
    let y = (area.height.saturating_sub(popup_height)) / 2;
    let popup_area = Rect::new(x, y, popup_width, popup_height);

    f.render_widget(Clear, popup_area);

    let block = Block::default()
        .title(Span::styled(
            " ? Agent 提问 ",
            Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD),
        ))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::Cyan));
    f.render_widget(&block, popup_area);

    let inner = block.inner(popup_area);

    // ── header 行：每个问题一个 tab，激活的反色，已确认的显示 ✓ ──────────────
    let header_area = Rect { height: 1, ..inner };
    let mut tab_spans: Vec<Span> = Vec::new();
    for (i, q) in prompt.questions.iter().enumerate() {
        let short: String = q.data.description.chars().take(8).collect();
        let done = prompt.confirmed.get(i).copied().unwrap_or(false);
        let check = if done { "✓" } else { " " };
        let label = format!(" {check} Q{}: {} ", i + 1, short);
        let style = if i == prompt.active_tab {
            Style::default().fg(Color::Black).bg(Color::Cyan).add_modifier(Modifier::BOLD)
        } else if done {
            Style::default().fg(Color::Green)
        } else {
            Style::default().fg(Color::DarkGray)
        };
        tab_spans.push(Span::styled(label, style));
        if i + 1 < prompt.questions.len() {
            tab_spans.push(Span::raw(" "));
        }
    }
    f.render_widget(Paragraph::new(Line::from(tab_spans)), header_area);

    // ── 分隔线 ────────────────────────────────────────────────────────────────
    let sep_area = Rect { y: inner.y + 1, height: 1, ..inner };
    let sep = "─".repeat(inner.width as usize);
    f.render_widget(
        Paragraph::new(Span::styled(sep, Style::default().fg(Color::DarkGray))),
        sep_area,
    );

    // ── 当前问题内容 ──────────────────────────────────────────────────────────
    let content_area = Rect {
        y: inner.y + 2,
        height: inner.height.saturating_sub(2),
        ..inner
    };
    let mut lines: Vec<Line> = Vec::new();

    // 描述
    for l in cur.data.description.lines() {
        lines.push(Line::from(Span::styled(l.to_string(), Style::default().fg(Color::White))));
    }
    let select_hint = if cur.data.multi_select { "[多选]" } else { "[单选]" };
    lines.push(Line::from(Span::styled(select_hint, Style::default().fg(Color::DarkGray))));

    // 选项列表
    for (i, opt) in cur.data.options.iter().enumerate() {
        let is_cursor = !cur.in_custom_input && cur.option_cursor == i as isize;
        let is_selected = cur.selected.get(i).copied().unwrap_or(false);
        let check = if is_selected { "●" } else { "○" };
        let row_style = if is_cursor {
            Style::default().fg(Color::Black).bg(Color::Cyan)
        } else if is_selected {
            Style::default().fg(Color::Cyan)
        } else {
            Style::default().fg(Color::White)
        };
        lines.push(Line::from(vec![
            Span::styled(
                format!(" {} {} ", if is_cursor { "▶" } else { " " }, check),
                row_style,
            ),
            Span::styled(opt.label.clone(), row_style),
        ]));
    }

    // 自定义输入行
    if cur.data.allow_custom_input {
        lines.push(Line::from(""));
        let is_cur = cur.in_custom_input;
        let ph = cur.data.placeholder.as_deref().unwrap_or("输入自定义内容…");
        let display = if cur.custom_input.is_empty() && !is_cur {
            ph.to_string()
        } else {
            format!("{}{}", cur.custom_input, if is_cur { "█" } else { "" })
        };
        let style = if is_cur {
            Style::default().fg(Color::Black).bg(Color::Yellow)
        } else {
            Style::default().fg(Color::DarkGray)
        };
        lines.push(Line::from(vec![
            Span::styled(if is_cur { " ▶ " } else { "   " }, style),
            Span::styled(display, style),
        ]));
    }

    f.render_widget(
        Paragraph::new(Text::from(lines)).wrap(Wrap { trim: false }),
        content_area,
    );
}

/// 将工具参数格式化为单行预览
fn format_input_preview(input: &serde_json::Value, max_len: usize) -> String {
    let s = match input {
        serde_json::Value::Object(map) => {
            // 取最重要的字段：command > file_path > pattern > 第一个字段
            let key = ["command", "file_path", "pattern", "path"]
                .iter()
                .find(|k| map.contains_key(**k))
                .copied()
                .or_else(|| map.keys().next().map(|k| k.as_str()));

            if let Some(k) = key {
                if let Some(v) = map.get(k) {
                    let val = match v {
                        serde_json::Value::String(s) => s.clone(),
                        other => other.to_string(),
                    };
                    format!("{k}={val}")
                } else {
                    input.to_string()
                }
            } else {
                "{}".to_string()
            }
        }
        other => other.to_string(),
    };

    if s.chars().count() > max_len && max_len > 1 {
        format!("{}…", s.chars().take(max_len - 1).collect::<String>())
    } else {
        s
    }
}
