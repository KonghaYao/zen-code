use anyhow::Result;
use ratatui::crossterm::event::{self, Event};
use ratatui_textarea::{Input, Key};
use std::time::Duration;

use crate::app::App;

pub enum Action {
    Quit,
    Submit(String),
    Redraw,
}

/// 处理下一个终端事件，返回 Action
pub async fn next_event(app: &mut App) -> Result<Option<Action>> {
    if !event::poll(Duration::from_millis(50))? {
        return Ok(Some(Action::Redraw));
    }

    let ev = event::read()?;

    match ev {
        Event::Resize(_, _) => {
            // 保持跟随状态不变，offset 由 ui 层重新计算
        }
        Event::Key(_) => {
            let input = Input::from(ev);

            // loading 时只允许退出和滚动
            if app.loading {
                match input {
                    Input { key: Key::Char('c'), ctrl: true, .. } => return Ok(Some(Action::Quit)),
                    Input { key: Key::Up, .. }   => app.scroll_up(),
                    Input { key: Key::Down, .. } => app.scroll_down(),
                    _ => {}
                }
                return Ok(Some(Action::Redraw));
            }

            match input {
                // 退出
                Input { key: Key::Char('c'), ctrl: true, .. } => return Ok(Some(Action::Quit)),
                Input { key: Key::Esc, .. } => return Ok(Some(Action::Quit)),

                // 发送（Ctrl+S）
                Input { key: Key::Char('s'), ctrl: true, .. } => {
                    let text = app.textarea.lines().join("\n");
                    let text = text.trim().to_string();
                    if !text.is_empty() {
                        app.textarea = crate::app::build_textarea(false);
                        return Ok(Some(Action::Submit(text)));
                    }
                }

                // 滚动消息区
                Input { key: Key::Up,   alt: true, .. } => app.scroll_up(),
                Input { key: Key::Down, alt: true, .. } => app.scroll_down(),
                Input { key: Key::PageUp, .. }   => { for _ in 0..10 { app.scroll_up(); } }
                Input { key: Key::PageDown, .. } => { for _ in 0..10 { app.scroll_down(); } }

                // 其余交给 textarea
                input => { app.textarea.input(input); }
            }
        }
        _ => {}
    }

    Ok(Some(Action::Redraw))
}
