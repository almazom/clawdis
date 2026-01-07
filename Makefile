.PHONY: bot-start bot-stop bot-restart bot-restart-cli bot-restart-app bot-status bot-health bot-logs bot-kill \
	start stop restart restart-cli restart-app status health logs kill-gateway \
	install build rebuild lint format test test-coverage dev pipeline

bot-start:
	./scripts/start-mac.sh

bot-stop:
	./scripts/stop-mac.sh

# Kill all gateway processes (deep kill to avoid conflicts)
bot-kill:
	@echo "🔍 Finding gateway processes..."
	@pgrep -f "node.*gateway" && { \
		echo "🛑 Killing gateway processes..."; \
		pkill -9 -f "node.*gateway" 2>/dev/null || true; \
		sleep 2; \
		pgrep -f "node.*gateway" && echo "⚠️  Some processes still running" || echo "✅ All gateway processes killed"; \
	} || echo "✅ No gateway processes found"
	@echo "🔍 Checking ports 18789, 18790, 18791, 18793..."
	@for port in 18789 18790 18791 18793; do \
		lsof -i :$$port 2>/dev/null | grep LISTEN && echo "⚠️  Port $$port still in use" || echo "✅ Port $$port free"; \
	done

# Live tail of bot logs (shows pipeline steps with emoji)
bot-logs:
	@echo "📺 Watching gateway logs (Ctrl+C to stop)..."
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@tail -f ~/.clawdis/gateway.log 2>/dev/null || { \
		echo "No ~/.clawdis/gateway.log found, trying /tmp/gateway.log..."; \
		tail -f /tmp/gateway.log 2>/dev/null || { \
			echo "No log files found, trying process stdout..."; \
			PID=$$(pgrep -f "node.*gateway" | head -1); \
			if [ -n "$$PID" ]; then \
				tail -f /proc/$$PID/fd/1 2>/dev/null; \
			else \
				echo "❌ No gateway process running. Start with: make restart"; \
			fi; \
		}; \
	}

# Full restart: build + systemd restart (requires sudo)
bot-restart:
	@echo "🔨 Building..."
	@pnpm build
	@echo "🛑 Stopping systemd service..."
	@sudo systemctl stop clawdis-gateway.service 2>/dev/null || true
	@echo "🧹 Cleaning zombie processes..."
	@make bot-kill
	@echo "🔍 DIAGNOSTICS: Checking for remaining gateway processes..."
	@pgrep -f "node.*gateway" && echo "⚠️  Some processes still running!" || echo "✅ No gateway processes found"
	@for port in 18789 18790 18791 18793; do \
		sudo lsof -t -i:$$port | xargs sudo kill -9 2>/dev/null || true; \
	done
	@sudo systemctl daemon-reload
	@echo "🚀 Starting systemd service..."
	@sudo systemctl start clawdis-gateway.service
	@sleep 3
	@echo "📊 Status:"
	@systemctl status clawdis-gateway.service --no-pager | head -8
	@echo ""
	@echo "✅ Gateway restarted! Run 'make logs' to watch pipeline"

# CLI gateway restart (manual, no systemd)
bot-restart-cli:
	./scripts/restart-cli.sh

# macOS app restart (requires Xcode - blocked by Swift 6.2.3 bug)
bot-restart-app:
	./scripts/restart-mac.sh

bot-status:
	pnpm clawdis status

bot-health:
	pnpm clawdis gateway health

# Convenience aliases
start: bot-start
stop: bot-stop
restart: bot-restart
restart-cli: bot-restart-cli
restart-app: bot-restart-app
status: bot-status
health: bot-health
logs: bot-logs
kill-gateway: bot-kill

# Common pipeline commands
install:
	pnpm install

build:
	pnpm build

rebuild: build

lint:
	pnpm lint

format:
	pnpm format

test:
	pnpm test

test-coverage:
	pnpm test:coverage

dev:
	pnpm dev

pipeline: install lint test build
