#!/bin/bash
# Автоматическое переключение темы Kitty в зависимости от SSH подключения

# Проверяем, подключены ли мы по SSH
if [ -n "$SSH_CLIENT" ] || [ -n "$SSH_TTY" ]; then
    # Мы в SSH-сессии - применяем тему для удаленного подключения
    THEME="remote-ssh.conf"
    echo "SSH подключение обнаружено. Применяется тема: $THEME"
else
    # Локальная сессия - применяем локальную тему
    THEME="local.conf"
    echo "Локальная сессия. Применяется тема: $THEME"
fi

# Путь к темам (можно изменить на нужный путь)
KITTY_THEMES_DIR="${KITTY_THEMES_DIR:-$HOME/.config/kitty/themes}"
THEME_PATH="$KITTY_THEMES_DIR/$THEME"

# Проверяем, существует ли файл темы
if [ -f "$THEME_PATH" ]; then
    # Применяем тему с помощью kitty @ set-colors
    # Для этого нужно иметь запущенный kitty с включенным remote control
    if command -v kitty &> /dev/null; then
        kitty @ set-colors --configured -a "$THEME_PATH" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "Тема успешно применена: $THEME"
        else
            echo "Не удалось применить тему. Убедитесь, что remote_control включен в kitty.conf"
            echo "Добавьте в kitty.conf: allow_remote_control yes"
        fi
    else
        echo "Kitty не найден в PATH"
    fi
else
    echo "Файл темы не найден: $THEME_PATH"
    echo "Создайте тему или установите правильный путь в KITTY_THEMES_DIR"
fi
