# Настройка автоматической смены темы Kitty для SSH

Эта настройка позволяет автоматически менять тему Kitty terminal в зависимости от того, подключены ли вы локально или по SSH.

## Быстрая настройка (3 шага)

### Шаг 1: Скопируйте темы в конфиг kitty

```bash
# Создайте директорию для тем, если её нет
mkdir -p ~/.config/kitty/themes

# Скопируйте темы
cp kitty-themes/local.conf ~/.config/kitty/themes/
cp kitty-themes/remote-ssh.conf ~/.config/kitty/themes/
```

### Шаг 2: Настройте kitty.conf

Добавьте в файл `~/.config/kitty/kitty.conf`:

```conf
# Включить удаленное управление (необходимо для смены тем)
allow_remote_control yes

# Включить сокет для коммуникации (опционально, но рекомендуется)
listen_on unix:$HOME/.kitty.sock
```

### Шаг 3: Установите автоматическое переключение

Выберите один из трех способов:

#### Способ А: Через direnv (РЕКОМЕНДУЕТСЯ)

1. Установите direnv:
```bash
# Ubuntu/Debian
sudo apt-get install direnv

# macOS
brew install direnv
```

2. Настройте оболочку: добавьте в `~/.bashrc` или `~/.zshrc`:
```bash
eval "$(direnv hook bash)"  # для bash
# или
eval "$(direnv hook zsh)"   # для zsh
```

3. В каждом проекте выполните один раз:
```bash
cp kitty-themes *.sh .envrc /path/to/your/project/
cd /path/to/your/project
direnv allow
```

#### Способ Б: Через .bashrc/.zshrc

Добавьте в `~/.bashrc` или `~/.zshrc`:

```bash
# Автоматическое переключение темы Kitty
function kitty_auto_theme() {
    if [ -f ".kitty-theme-local" ]; then
        source .kitty-theme-local
    fi
}

# Вызывать при каждом cd
function cd() {
    builtin cd "$@"
    kitty_auto_theme
}

# Вызывать при входе в новую директорию
kitty_auto_theme
```

#### Способ В: Через SSH-конфиг

Добавьте в `~/.ssh/config`:

```ssh-config
Host *
    RemoteCommand kitty @ set-colors --configured -a ~/.config/kitty/themes/remote-ssh.conf
    RequestTTY yes
```

## Визуальные отличия

### Локальная тема (local.conf)
- **Светлый фон** (белый)
- **Зеленые вкладки** и рамки
- Яркие цвета для комфортной локальной работы

### SSH тема (remote-ssh.conf)
- **Темный фон** (почти черный)
- **Красные вкладки** и рамки (визуальный сигнал)
- Контрастные цвета для лучшей читаемости по SSH

## Проверка работы

1. **Локально**: Перезапустите терминал или выполните:
```bash
cd /path/to/your/project
kitty @ set-colors --configured -a ~/.config/kitty/themes/local.conf
```

2. **По SSH**: Подключитесь к серверу:
```bash
ssh your-server
# Тема должна автоматически смениться на темную/красную
```

## Пользовательские темы

Вы можете создать свои темы:

1. Скопируйте существующую тему:
```bashncp ~/.config/kitty/themes/local.conf ~/.config/kitty/themes/my-theme.conf
```

2. Отредактируйте цвета по вкусу
3. Примените вручную для теста:
```bash
kitty @ set-colors --configured -a ~/.config/kitty/themes/my-theme.conf
```

## Решение проблем

### "kitty @ set-colors не работает"
- Убедитесь, что `allow_remote_control yes` в kitty.conf
- Перезапустите Kitty после изменения конфига
- Проверьте, что находитесь в активном окне Kitty

### "direnv: command not found"
- Установите direnv (см. Шаг 3)
- Добавьте hook в ваш .bashrc/.zshrc
- Перезапустите терминал

### Тема не меняется при cd
- Убедитесь, что .envrc существует в каталоге проекта
- Выполните `direnv allow`
- Проверьте, что KITTY_THEMES_DIR установлен правильно

## Дополнительные возможности

### Игнорировать тему для определенных хостов
Добавьте в `.envrc`:
```bash
if [[ "$HOSTNAME" == "my-special-host" ]]; then
    # Не менять тему для этого хоста
    return
fi
```

### Кастомизация по типу проекта
Добавьте в `.envrc`:
```bash
if [ -f "package.json" ]; then
    # Node.js проект
    kitty @ set-colors --configured -a "$KITTY_THEMES_DIR/node-theme.conf"
elif [ -f "requirements.txt" ]; then
    # Python проект
    kitty @ set-colors --configured -a "$KITTY_THEMES_DIR/python-theme.conf"
fi
```

### Резервное копирование конфигурации
```bash
# Скопируйте текущие настройки
cp ~/.config/kitty/kitty.conf ~/.config/kitty/kitty.conf.backup

# Восстановите при необходимости
cp ~/.config/kitty/kitty.conf.backup ~/.config/kitty/kitty.conf
```

## Безопасность

- SSH-тема помогает предотвратить выполнение команд на неправильном сервере
- Визуальный индикатор (красный цвет) clearly indicates remote session
- Рекомендуется использовать разные цвета для production/staging/development серверов
