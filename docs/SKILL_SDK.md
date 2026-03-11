# Clawdis Skill SDK

First-class skills support для Clawdis - создавайте, управляйте и распространяйте skills с лёгкостью.

## Что такое Skill?

Skill - это модульная возможность, которая расширяет функциональность Clawdis. Skills упакованы как директории с `SKILL.md` файлом, содержащим метаданные и документацию.

## Быстрый старт

### Создание нового skill

```bash
clawdis skill create my-skill -d "My custom skill" -e "🔧"
```

### Просмотр активных skills

```bash
clawdis skill list
```

### Просмотр статуса skill

```bash
clawdis skill status my-skill
```

### Включение/отключение skills

```bash
clawdis skill disable my-skill
clawdis skill enable my-skill
```

### Валидация skills

```bash
clawdis skill validate
```

## Структура Skill

```
skills/my-skill/
├── SKILL.md          # Основной файл skill
├── scripts/          # Опционально: вспомогательные скрипты
└── assets/           # Опционально: ресурсы
```

## Формат SKILL.md

```yaml
---
name: my-skill
description: Краткое описание skill
homepage: https://example.com
metadata: {
  "clawdis": {
    "emoji": "🔧",
    "skillKey": "my-skill",
    "primaryEnv": "MY_SKILL_API_KEY",
    "always": false,
    "requires": {
      "bins": ["my-cli"],
      "env": ["MY_SKILL_API_KEY"],
      "config": ["browser.enabled"]
    },
    "install": [
      {
        "id": "brew",
        "kind": "brew",
        "formula": "my-cli",
        "bins": ["my-cli"],
        "label": "Install via Homebrew"
      },
      {
        "id": "npm",
        "kind": "node",
        "package": "my-cli",
        "bins": ["my-cli"],
        "label": "Install via npm"
      }
    ]
  }
}
---

# my-skill

Длинное описание skill с примерами использования.

## Usage

Как использовать этот skill.

## Examples

\`\`\`bash
my-cli --help
\`\`\`

## Configuration

Опции конфигурации через ~/.clawdis/clawdis.json:

\`\`\`json
{
  "skills": {
    "my-skill": {
      "enabled": true,
      "apiKey": "your-api-key",
      "env": {
        "MY_SKILL_API_KEY": "your-api-key"
      }
    }
  }
}
\`\`\`
```

## Метаданные Clawdis

### Поле `clawdis`

| Поле | Тип | Описание |
|------|-----|----------|
| `emoji` | string | Эмодзи для отображения |
| `skillKey` | string | Ключ для поиска в конфиге (по умолчанию = name) |
| `primaryEnv` | string | Основная переменная окружения для API ключа |
| `always` | boolean | Всегда включен, игнорирует requirements |
| `requires` | object | Требования для активации |
| `install` | array[] | Опции установки |

### Требования (`requires`)

```json
{
  "requires": {
    "bins": ["gemini", "curl"],
    "env": ["GEMINI_API_KEY", "OPENAI_API_KEY"],
    "config": ["browser.enabled", "web.enabled"]
  }
}
```

- `bins`: Бинарники, которые должны быть в PATH
- `env`: Переменные окружения, которые должны быть установлены
- `config`: Пути в конфиге, которые должны быть truthy

### Установка (`install`)

Поддерживаемые типы установки:

- `brew`: Homebrew формула
- `node`: npm/pnpm/yarn пакет
- `go`: Go модуль
- `uv`: uv tool пакет

```json
{
  "install": [
    {
      "id": "brew",
      "kind": "brew",
      "formula": "gemini-cli",
      "bins": ["gemini"],
      "label": "Install Gemini CLI (brew)"
    },
    {
      "id": "npm",
      "kind": "node", 
      "package": "@google/gemini-cli",
      "bins": ["gemini"],
      "label": "Install via npm"
    }
  ]
}
```

## Приоритеты загрузки Skills

Skills загружаются из нескольких источников (в порядке приоритета от низкого к высокому):

1. **Extra directories** (`skillsLoad.extraDirs` в конфиге)
2. **Bundled** (`./skills/` в пакете clawdis)
3. **Managed** (`~/.clawdis/skills/`)
4. **Workspace** (`./skills/` в рабочей директории)

При конфликте имен используется skill с более высоким приоритетом.

## Конфигурация Skills

Настройте skills через `~/.clawdis/clawdis.json`:

```json
{
  "skills": {
    "my-skill": {
      "enabled": true,
      "apiKey": "sk-...",
      "env": {
        "MY_SKILL_API_KEY": "sk-...",
        "MY_SKILL_ENDPOINT": "https://api.example.com"
      }
    }
  },
  "skillsLoad": {
    "extraDirs": ["/path/to/shared/skills"]
  },
  "skillsInstall": {
    "preferBrew": true,
    "nodeManager": "pnpm"
  }
}
```

## API для разработчиков

### Программный доступ к skills

```typescript
import {
  buildWorkspaceSkillSnapshot,
  loadWorkspaceSkillEntries,
  applySkillEnvOverrides,
} from "./agents/skills.js";

// Загрузить все skills
const entries = loadWorkspaceSkillEntries(workspaceDir, { config });

// Получить snapshot с prompt для LLM
const snapshot = buildWorkspaceSkillSnapshot(workspaceDir, { config });
console.log(snapshot.prompt); // Отформатированный prompt со skills

// Применить env overrides
const restore = applySkillEnvOverrides({ skills: entries, config });
// ... использовать skills ...
restore(); // Восстановить оригинальные env
```

### Типы данных

```typescript
interface SkillEntry {
  skill: Skill;
  frontmatter: Record<string, string>;
  clawdis?: ClawdisSkillMetadata;
}

interface ClawdisSkillMetadata {
  always?: boolean;
  skillKey?: string;
  primaryEnv?: string;
  emoji?: string;
  homepage?: string;
  requires?: {
    bins?: string[];
    env?: string[];
    config?: string[];
  };
  install?: SkillInstallSpec[];
}
```

## Лучшие практики

1. **Используйте frontmatter**: Все метаданные должны быть в frontmatter
2. **Опишите requirements**: Явно укажите bins, env и config
3. **Предоставьте install options**: Добавьте инструкции по установке
4. **Используйте skillKey**: Для сложных skills используйте уникальный skillKey
5. **Документируйте**: Подробно опишите usage и configuration
6. **Валидируйте**: Используйте `clawdis skill validate` перед публикацией

## Примеры Skills

### Простой skill с бинарником

```yaml
---
name: gemini
description: Gemini CLI for one-shot Q&A
metadata: {"clawdis":{"requires":{"bins":["gemini"]},"install":[{"id":"brew","kind":"brew","formula":"gemini-cli","bins":["gemini"]}]}}
---
```

### Skill с API ключом

```yaml
---
name: openai-image-gen
description: Generate images via OpenAI
metadata: {"clawdis":{"requires":{"env":["OPENAI_API_KEY"]},"primaryEnv":"OPENAI_API_KEY","install":[{"id":"manual","kind":"manual","instructions":"Set OPENAI_API_KEY env var"}]}}
---
```

### Skill с config gate

```yaml
---
name: browser-automation
description: Browser automation skill
metadata: {"clawdis":{"requires":{"config":["browser.enabled"]},"always":false}}
---
```

## Распространение Skills

### Локальное распространение

```bash
# Скопируйте skill в workspace
cp -r my-skill ~/clawd/skills/

# Или в managed директорию
cp -r my-skill ~/.clawdis/skills/
```

### Через Git

```bash
# Добавьте в проект как submodule
git submodule add https://github.com/user/my-clawdis-skill.git skills/my-skill
```

### Через npm/pnpm (в будущем)

```bash
# Установка из registry (планируется)
clawdis skill install my-skill
```

## Отладка Skills

```bash
# Просмотр скомпилированного prompt
clawdis skill prompt

# JSON вывод для programmatic доступа
clawdis skill list --format json
clawdis skill status my-skill --format json

# Все skills включая неактивные
clawdis skill list --all
```

## Roadmap

- [x] CLI команды для управления skills
- [x] Skill validation
- [x] JSON output для programmatic доступа
- [ ] Skill marketplace/registry
- [ ] Hot-reload в development режиме
- [ ] Skill testing framework
- [ ] Gateway UI для skills
- [ ] Auto-install при первом использовании
