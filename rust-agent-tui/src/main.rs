mod app;
mod event;
mod prompt;
mod ui;

use anyhow::Result;
use ratatui::{
    crossterm::{
        execute,
        terminal::{EnterAlternateScreen, LeaveAlternateScreen, enable_raw_mode, disable_raw_mode},
        event::{EnableMouseCapture, DisableMouseCapture},
    },
    prelude::*,
};
use std::io;

#[tokio::main]
async fn main() -> Result<()> {
    // 加载 .env 文件（仅开发环境，文件不存在时静默忽略）
    let _ = dotenvy::dotenv();

    // 初始化终端
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // 运行应用
    let result = run_app(&mut terminal).await;

    // 恢复终端
    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen, DisableMouseCapture)?;
    terminal.show_cursor()?;

    if let Err(e) = result {
        eprintln!("Error: {e}");
    }

    Ok(())
}

async fn run_app(terminal: &mut Terminal<CrosstermBackend<io::Stdout>>) -> Result<()> {
    let mut app = app::App::new();

    loop {
        terminal.draw(|f| ui::render(f, &mut app))?;

        // 轮询后台 agent 结果
        app.poll_agent();

        if let Some(action) = event::next_event(&mut app).await? {
            match action {
                event::Action::Quit => break,
                event::Action::Submit(input) => {
                    app.submit_message(input);
                }
                event::Action::Redraw => {}
            }
        }
    }

    Ok(())
}
