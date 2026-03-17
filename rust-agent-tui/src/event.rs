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

pub async fn next_event(app: &mut App) -> Result<Option<Action>> {
    if !event::poll(Duration::from_millis(50))? {
        return Ok(Some(Action::Redraw));
    }

    let ev = event::read()?;

    match ev {
        Event::Resize(_, _) => {}
        Event::Key(_) => {
            let input = Input::from(ev);

            // AskUser 批量弹窗
            if app.ask_user_prompt.is_some() {
                match input {
                    Input { key: Key::Char('c'), ctrl: true, .. } => return Ok(Some(Action::Quit)),
                    // Tab / Shift+Tab 切换问题
                    Input { key: Key::Tab, shift: false, .. } => app.ask_user_next_tab(),
                    Input { key: Key::Tab, shift: true, .. } => app.ask_user_prev_tab(),
                    // Enter 提交所有答案
                    Input { key: Key::Enter, .. } => app.ask_user_confirm(),
                    // 上下移动当前问题内的选项光标
                    Input { key: Key::Up, .. }   => app.ask_user_move(-1),
                    Input { key: Key::Down, .. } => app.ask_user_move(1),
                    // Space 切换选中
                    Input { key: Key::Char(' '), .. } => app.ask_user_toggle(),
                    // 文字输入（自定义输入模式下）
                    Input { key: Key::Backspace, .. } => app.ask_user_pop_char(),
                    Input { key: Key::Char(c), ctrl: false, alt: false, .. } => {
                        app.ask_user_push_char(c);
                    }
                    _ => {}
                }
                return Ok(Some(Action::Redraw));
            }

            // HITL 批量弹窗激活时，优先处理弹窗按键
            if app.hitl_prompt.is_some() {
                match input {
                    Input { key: Key::Char('c'), ctrl: true, .. } => return Ok(Some(Action::Quit)),

                    // 上下移动光标
                    Input { key: Key::Up, .. }
                    | Input { key: Key::Char('k'), .. } => app.hitl_move(-1),
                    Input { key: Key::Down, .. }
                    | Input { key: Key::Char('j'), .. } => app.hitl_move(1),

                    // 空格/t：切换当前项
                    Input { key: Key::Char(' '), .. }
                    | Input { key: Key::Char('t'), .. } => app.hitl_toggle(),

                    // y / A：全部批准并确认
                    Input { key: Key::Char('y'), .. } => app.hitl_approve_all(),

                    // n / N：全部拒绝并确认
                    Input { key: Key::Char('n'), .. } => app.hitl_reject_all(),

                    // Enter：按当前各项选择确认
                    Input { key: Key::Enter, .. } => app.hitl_confirm(),

                    _ => {}
                }
                return Ok(Some(Action::Redraw));
            }

            match input {
                Input { key: Key::Char('c'), ctrl: true, .. } => return Ok(Some(Action::Quit)),
                Input { key: Key::Esc, .. } if !app.loading => return Ok(Some(Action::Quit)),

                Input { key: Key::Char('s'), ctrl: true, .. } if !app.loading => {
                    let text = app.textarea.lines().join("\n");
                    let text = text.trim().to_string();
                    if !text.is_empty() {
                        app.textarea = crate::app::build_textarea(false);
                        return Ok(Some(Action::Submit(text)));
                    }
                }

                Input { key: Key::Up, .. }     => app.scroll_up(),
                Input { key: Key::Down, .. }   => app.scroll_down(),
                Input { key: Key::PageUp, .. } => { for _ in 0..10 { app.scroll_up(); } }
                Input { key: Key::PageDown, .. } => { for _ in 0..10 { app.scroll_down(); } }

                input if !app.loading => { app.textarea.input(input); }

                _ => {}
            }
        }
        _ => {}
    }

    Ok(Some(Action::Redraw))
}
