# Conventional Version Action

Parses [conventional commits](https://www.conventionalcommits.org/) since the
last version tag and determines the next semantic version bump.

## Usage

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0 # required to read full git history

  - name: Determine version bump
    id: version
    uses: chrisschreiber/conventional-version-action@v1

  - name: Print outputs
    run: |
      echo "Change: ${{ steps.version.outputs.change }}"
      echo "Last:   ${{ steps.version.outputs.last }}"
      echo "Next:   ${{ steps.version.outputs.next }}"
```

## Inputs

| Name           | Required | Default | Description                                                      |
| -------------- | -------- | ------- | ---------------------------------------------------------------- |
| `tag-prefix`   | No       | `v`     | Prefix used for version tags when searching for the last release |

## Outputs

| Name       | Description                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| `change`   | Semantic version change level: `major`, `minor`, `patch`, or `none`                                     |
| `last`     | Last version found in tags (e.g. `1.2.3`). Empty if no previous tag exists.                             |
| `next`     | Next version after applying the bump (e.g. `1.3.0`). Empty if change is `none` or no previous tag.      |

## Bump rules

| Commit type                                               | Bump      |
| --------------------------------------------------------- | --------- |
| Any commit with `BREAKING CHANGE` footer                  | `major`   |
| `feat`                                                    | `minor`   |
| `fix`, `perf`                                             | `patch`   |
| `chore`, `docs`, `style`, `refactor`, `test`, and others  | `none`    |

## Example workflow: tag on bump

```yaml
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Determine version bump
        id: version
        uses: chrisschreiber/conventional-version-action@v1

      - name: Create tag
        if: steps.version.outputs.next != ''
        run: |
          git tag "v${{ steps.version.outputs.next }}"
          git push origin "v${{ steps.version.outputs.next }}"
```
