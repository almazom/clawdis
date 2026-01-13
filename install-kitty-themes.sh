#!/bin/bash
# Установка системы автоматической смены темы Kitty для SSH

set -e

echo "=== Установка системы автоматической смены темы Kitty ==="
echo

# Проверяем, установлен ли kitty
if ! command -v kitty &> /dev/null; then
    echo "⚠️  Kitty terminal не найден в системе"
    echo "Установите kitty сначала: https://sw.kovidgoyal.net/kitty/"
    exit 1
fi

echo "✓ Kitty найден"

# Создаем директорию для тем
KITTY_THEMES_DIR="$HOME/.config/kitty/themes"
echo "Создание директории тем: $KITTY_THEMES_DIR"
mkdir -p "$KITTY_THEMES_DIR"

# Копируем темы
echo "Копирование тем..."
cp kitty-themes/*.conf "$KITTY_THEMES_DIR/"
echo "✓ Темы скопированы"

# Делаем скрипты исполняемыми
echo "Установка скриптов..."
cp kitty-switch-theme.sh kitty-switch-theme-advanced.sh /usr/local/bin/ 2>/dev/null || {
    echo "⚠️  Не удалось скопировать в /usr/local/bin/"
    echo "    Скопируйте скрипты вручную в директорию из PATH"
    echo "    sudo cp kitty-switch-theme*.sh /usr/local/bin/"
}

# Проверяем конфиг kitty
KITTY_CONF="$HOME/.config/kitty/kitty.conf"
echo "Проверка конфигурации Kitty: $KITTY_CONF"

if [ -f "$KITTY_CONF" ]; then
    # Делаем резервную копию
    cp "$KITTY_CONF" "$KITTY_CONF.backup.$(date +%Y%m%d_%H%M%S)"
    echo "✓ Резервная копия конфига создана"
    
    # Проверяем, есть ли уже нужные настройки
    if grep -q "allow_remote_control yes" "$KITTY_CONF"; then
        echo "✓ Remote control уже включен"
    else
        echo "allow_remote_control yes" >> "$KITTY_CONF"
        echo "✓ Добавлено: allow_remote_control yes"
    fi
    
    if grep -q "listen_on" "$KITTY_CONF"; then
        echo "✓ Listen socket уже настроен"
    else
        echo "listen_on unix:$HOME/.kitty.sock" >> "$KITTY_CONF"
        echo "✓ Добавлено: listen_on unix:$HOME/.kitty.sock"
    fi
else
    echo "⚠️  Конфиг kitty не найден"
    echo "Создайте его и добавьте:"
    echo "  allow_remote_control yes"
    echo "  listen_on unix:\$HOME/.kitty.sock"
fi

echo
echo "=== Варианты использования ==="
echo
echo "1. Через direnv (рекомендуется):"
echo "   - Установите direnv"
echo "   - Добавьте hook в ~/.bashrc или ~/.zshrc"
echo "   - Скопируйте .envrc в ваш проект"
echo "   - Выполните: direnv allow"
echo
echo "2. Через SSH config:"
echo "   - Добавьте настройки из ssh-config-example в ~/.ssh/config"
echo   - Настройте хосты под ваши серверы"
echo
echo "3. Вручную:"
echo "   - kitty-switch-theme.sh          # Автоматический режим"
echo "   - kitty-switch-theme.sh prod     # Продакшн тема"
echo "   - kitty-switch-theme.sh staging  # Стагинг тема"
echo "   - kitty-switch-theme.sh dev      # Девелопмент тема"
echo "   - kitty-switch-theme.sh local    # Локальная тема"
echo
echo "После установки перезапустите Kitty!"
echo
echo "Тестирование:"
echo "  kitty-switch-theme.sh local    # Должна примениться светлая тема"
echo "  kitty-switch-theme.sh ssh      # Должна примениться темная тема"
echo
echo "=== Установка завершена! ==="
