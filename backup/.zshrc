# ==========================================================
# 🏠 Homebrew
# ==========================================================
# Initialize Homebrew environment
eval "$(/opt/homebrew/bin/brew shellenv)"

# Use Homebrew curl instead of macOS built-in curl
export PATH="/opt/homebrew/opt/curl/bin:$PATH"
export LDFLAGS="-L/opt/homebrew/opt/curl/lib"
export CPPFLAGS="-I/opt/homebrew/opt/curl/include"



# ==========================================================
# 🟢 Node.js (FNM)
# ==========================================================
# Automatically switch Node version based on .node-version
eval "$(fnm env --use-on-cd --shell zsh)"



# ==========================================================
# 🚀 Antigravity IDE CLI
# ==========================================================
export PATH="$HOME/.antigravity-ide/antigravity-ide/bin:$PATH"



# ==========================================================
# 📜 Zsh History
# ==========================================================
HISTFILE=~/.zsh_history
HISTSIZE=100000
SAVEHIST=100000

setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_ALL_DUPS
setopt HIST_FIND_NO_DUPS
setopt HIST_REDUCE_BLANKS
setopt SHARE_HISTORY
setopt INC_APPEND_HISTORY



# ==========================================================
# 🎨 Prompt
# ==========================================================
setopt PROMPT_SUBST

git_branch() {
    local branch
    branch=$(git symbolic-ref --quiet --short HEAD 2>/dev/null)
    [[ -n "$branch" ]] && echo " %F{yellow}[$branch]%f"
}

PROMPT='%F{blue} MuhammadSaif@Esra%f %F{white}%~%f$(git_branch) %F{cyan}%f '



# ==========================================================
# ⚡ Aliases
# ==========================================================

# Navigation
alias ..="cd .."
alias ...="cd ../.."
alias ....="cd ../../.."

# Terminal
alias cls="clear"
alias c="clear"

# Listing
alias ls="ls -G"
alias ll="ls -lahG"

# Git
alias gs="git status"
alias ga="git add ."
alias gc="git commit"
alias gp="git push"
alias gl="git pull"
alias gco="git checkout"

# Node
alias ni="npm install"
alias nr="npm run"
alias pi="pnpm install"
alias dev="pnpm dev"

# Better commands
alias ls="eza --icons"
alias ll="eza -lah --icons"
alias cat="bat"



# ==========================================================
# ⌨️ Zsh Plugins
# ==========================================================

# Autosuggestions
source /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh

# History search
source /opt/homebrew/share/zsh-history-substring-search/zsh-history-substring-search.zsh

# Arrow key bindings
bindkey '^[[A' history-substring-search-up
bindkey '^[[B' history-substring-search-down

# Syntax highlighting (always load LAST)
source /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh



# ==========================================================
# 🔑 Git SSH Profiles
# ==========================================================

ghp() {
    ssh -T git@ghp
}

ghw() {
    ssh -T git@ghw
}