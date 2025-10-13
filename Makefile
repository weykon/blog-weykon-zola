.PHONY: help setup db-up db-down dev build test migrate clean

help: ## 显示帮助信息
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

setup: ## 初始化项目（首次运行）
	@echo "Setting up project..."
	@cp -n .env.example .env || true
	@cd backend && cargo build
	@python3 -m venv .venv
	@. .venv/bin/activate && pip install -r scripts/requirements.txt
	@echo "Setup complete! Edit .env file and run 'make dev'"

db-up: ## 启动数据库
	docker-compose up -d
	@echo "Database started. pgAdmin: http://localhost:5050"

db-down: ## 停止数据库
	docker-compose down

db-restart: ## 重启数据库
	docker-compose restart

db-logs: ## 查看数据库日志
	docker-compose logs -f postgres

dev: db-up ## 启动开发服务器
	cd backend && cargo run

build: ## 编译生产版本
	cd backend && cargo build --release

test: ## 运行测试
	cd backend && cargo test

migrate: ## 运行数据迁移
	@echo "Activating virtual environment and running migration..."
	@. .venv/bin/activate && cd scripts && python migrate_posts.py ../content/blog

migrate-csv: ## 从 CSV 导入数据
	@read -p "Enter CSV file path: " csv_file; \
	. .venv/bin/activate && cd scripts && python import_csv.py $$csv_file

migrate-json: ## 从 JSON 导入数据
	@read -p "Enter JSON file path: " json_file; \
	. .venv/bin/activate && cd scripts && python import_json.py $$json_file

fmt: ## 格式化代码
	cd backend && cargo fmt

clippy: ## 运行 Clippy 检查
	cd backend && cargo clippy

clean: ## 清理构建文件
	cd backend && cargo clean
	rm -rf .venv

watch: ## 开发模式（自动重载）
	cd backend && cargo watch -x run

psql: ## 连接到 PostgreSQL
	docker exec -it blog_postgres psql -U blog_user -d blog_db

all: setup db-up dev ## 一键启动（setup + db + dev）
