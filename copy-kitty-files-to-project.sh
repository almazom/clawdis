#!/bin/bash
# Копирование файлов тем Kitty в новый проект

TARGET_DIR="${1:-.}"

if [ ! -d "$TARGET_DIR" ]; then
    echo "Ошибка: Директория '$TARGET_DIR' не существует"
    echo "Использование: $0 /путь/к/проекту"
    exit 1
fi

echo "Копирование файлов тем Kitty в $TARGET_DIR..."

# Копируем темы
cp -r kitty-themes "$TARGET_DIR/" 2>/dev/null || echo "⚠️  Не удалось скопировать kitty-themes"

# Копируем конфигурационные файлы
cp .envrc "$TARGET_DIR/" 2>/dev/null || echo "⚠️  Не удалось скопировать .envrc"
cp .kitty-theme-local "$TARGET_DIR/" 2>/dev/null || echo "⚠️  Не удалось скопировать .kitty-theme-local"

echo "✓ Файлы скопированы в $TARGET_DIR"
echo
echo "Далее:"
echo "1. Если используете direnv: cd $TARGET_DIR && direnv allow"
echo "2. Если используете SSH config: настройте ~/.ssh/config"
echo "3. Для теста: cd $TARGET_DIR && ./kitty-switch-theme.sh local"
