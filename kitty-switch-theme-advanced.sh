#!/bin/bash
# Расширенное переключение темы Kitty с определением типа сервера

# Функция для определения типа сервера
detect_server_type() {
    local hostname=$(hostname)
    
    # Проверяем по hostname (настраиваемые паттерны)
    if [[ "$hostname" =~ prod|production|live|prd|web[0-9]+ ]]; then
        echo "remote-production.conf"
    elif [[ "$hostname" =~ staging|stg|test|qa|dev[0-9]+ ]]; then
        echo "remote-staging.conf"
    elif [[ "$hostname" =~ dev|development|localhost|local|vm ]]; then
        echo "remote-dev.conf"
    else
        # По умолчанию используем стандартную SSH тему
        echo "remote-ssh.conf"
    fi
}

# Функция для применения темы
apply_theme() {
    local theme_file="$1"
    local theme_path="$KITTY_THEMES_DIR/$theme_file"
    
    if [ ! -f "$theme_path" ]; then
        echo "Ошибка: Файл темы не найден: $theme_path"
        return 1
    fi
    
    if ! command -v kitty &> /dev/null; then
        echo "Ошибка: Kitty не найден в PATH"
        return 1
    fi
    
    # Применяем тему
    kitty @ set-colors --configured -a "$theme_path" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "Тема применена: $theme_file"
        return 0
    else
        echo "Ошибка: Не удалось применить тему"
        echo "Убедитесь, что remote_control включен в kitty.conf"
        return 1
    fi
}

# Главная логика
main() {
    # Проверяем, подключены ли мы по SSH
    if [ -n "$SSH_CLIENT" ] || [ -n "$SSH_TTY" ]; then
        # Определяем тип сервера
        THEME=$(detect_server_type)
        echo "SSH подключение к $(hostname)"
        echo "Тип сервера: $THEME"
        
        # Применяем соответствующую тему
        apply_theme "$THEME"
    else
        # Локальная сессия
        echo "Локальная сессия"
        apply_theme "local.conf"
    fi
}

# Поддержка аргументов для ручного применения темы
case "${1:-auto}" in
    local)
        apply_theme "local.conf"
        ;;
    ssh|remote)
        apply_theme "remote-ssh.conf"
        ;;
    prod|production)
        apply_theme "remote-production.conf"
        ;;
    staging)
        apply_theme "remote-staging.conf"
        ;;
    dev|development)
        apply_theme "remote-dev.conf"
        ;;
    auto)
        main
        ;;
    *)
        echo "Использование: $0 {auto|local|ssh|prod|staging|dev}"
        echo "  auto       - Автоматическое определение (по умолчанию)"
        echo "  local      - Локальная тема"
        echo "  ssh        - Стандартная SSH тема"
        echo "  prod       - Продакшн тема (красная)"
        echo "  staging    - Стагинг тема (оранжевая)"
        echo "  dev        - Девелопмент тема (синяя)"
        exit 1
        ;;
esac
