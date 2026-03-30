package tui

import (
	"os"

	"github.com/charmbracelet/lipgloss"
)

// Theme defines the full color palette for PigeonGov's TUI.
// Two palettes ship: Catppuccin Mocha (dark) and Catppuccin Latte (light).
// The runtime chooses automatically based on terminal background,
// but --theme=dark|light and NO_COLOR override that.
type Theme struct {
	Primary   lipgloss.Color
	Secondary lipgloss.Color
	Success   lipgloss.Color
	Warning   lipgloss.Color
	Error     lipgloss.Color
	Info      lipgloss.Color
	Surface0  lipgloss.Color
	Surface1  lipgloss.Color
	Surface2  lipgloss.Color
	Text      lipgloss.Color
	Subtext   lipgloss.Color
	Overlay   lipgloss.Color

	// Domain-specific badge colors
	DomainTax         lipgloss.Color
	DomainImmigration lipgloss.Color
	DomainHousing     lipgloss.Color
	DomainBenefits    lipgloss.Color
	DomainDefault     lipgloss.Color

	// Whether color is disabled entirely (NO_COLOR, --high-contrast)
	NoColor bool
}

// DarkTheme is Catppuccin Mocha — the default for dark terminals.
var DarkTheme = Theme{
	Primary:           lipgloss.Color("#89b4fa"),
	Secondary:         lipgloss.Color("#94e2d5"),
	Success:           lipgloss.Color("#a6e3a1"),
	Warning:           lipgloss.Color("#f9e2af"),
	Error:             lipgloss.Color("#f38ba8"),
	Info:              lipgloss.Color("#89dceb"),
	Surface0:          lipgloss.Color("#1e1e2e"),
	Surface1:          lipgloss.Color("#313244"),
	Surface2:          lipgloss.Color("#45475a"),
	Text:              lipgloss.Color("#cdd6f4"),
	Subtext:           lipgloss.Color("#a6adc8"),
	Overlay:           lipgloss.Color("#585b70"),
	DomainTax:         lipgloss.Color("#cba6f7"),
	DomainImmigration: lipgloss.Color("#89dceb"),
	DomainHousing:     lipgloss.Color("#fab387"),
	DomainBenefits:    lipgloss.Color("#a6e3a1"),
	DomainDefault:     lipgloss.Color("#b4befe"),
}

// LightTheme is Catppuccin Latte — for light terminals or --theme=light.
var LightTheme = Theme{
	Primary:           lipgloss.Color("#1e66f5"),
	Secondary:         lipgloss.Color("#179299"),
	Success:           lipgloss.Color("#40a02b"),
	Warning:           lipgloss.Color("#df8e1d"),
	Error:             lipgloss.Color("#d20f39"),
	Info:              lipgloss.Color("#04a5e5"),
	Surface0:          lipgloss.Color("#eff1f5"),
	Surface1:          lipgloss.Color("#e6e9ef"),
	Surface2:          lipgloss.Color("#ccd0da"),
	Text:              lipgloss.Color("#4c4f69"),
	Subtext:           lipgloss.Color("#6c6f85"),
	Overlay:           lipgloss.Color("#9ca0b0"),
	DomainTax:         lipgloss.Color("#8839ef"),
	DomainImmigration: lipgloss.Color("#04a5e5"),
	DomainHousing:     lipgloss.Color("#fe640b"),
	DomainBenefits:    lipgloss.Color("#40a02b"),
	DomainDefault:     lipgloss.Color("#7287fd"),
}

// HighContrastTheme uses only 4-bit ANSI for maximum accessibility.
var HighContrastTheme = Theme{
	Primary:           lipgloss.Color("12"),
	Secondary:         lipgloss.Color("14"),
	Success:           lipgloss.Color("10"),
	Warning:           lipgloss.Color("11"),
	Error:             lipgloss.Color("9"),
	Info:              lipgloss.Color("14"),
	Surface0:          lipgloss.Color("0"),
	Surface1:          lipgloss.Color("8"),
	Surface2:          lipgloss.Color("7"),
	Text:              lipgloss.Color("15"),
	Subtext:           lipgloss.Color("7"),
	Overlay:           lipgloss.Color("8"),
	DomainTax:         lipgloss.Color("13"),
	DomainImmigration: lipgloss.Color("14"),
	DomainHousing:     lipgloss.Color("11"),
	DomainBenefits:    lipgloss.Color("10"),
	DomainDefault:     lipgloss.Color("12"),
}

// NoColorTheme disables all color output — honours the NO_COLOR convention.
var NoColorTheme = Theme{
	NoColor: true,
}

// DetectTheme picks a palette based on environment.
// Priority: NO_COLOR env > explicit flag > terminal background detection.
func DetectTheme(themeFlag string, highContrast bool) Theme {
	if _, ok := os.LookupEnv("NO_COLOR"); ok {
		return NoColorTheme
	}
	if highContrast {
		return HighContrastTheme
	}

	switch themeFlag {
	case "dark":
		return DarkTheme
	case "light":
		return LightTheme
	}

	// Auto-detect: lipgloss.HasDarkBackground checks the terminal.
	if lipgloss.HasDarkBackground() {
		return DarkTheme
	}
	return LightTheme
}

// DomainColor returns the badge color for a given workflow domain.
func (t Theme) DomainColor(domain string) lipgloss.Color {
	switch domain {
	case "tax":
		return t.DomainTax
	case "immigration":
		return t.DomainImmigration
	case "housing":
		return t.DomainHousing
	case "benefits":
		return t.DomainBenefits
	default:
		return t.DomainDefault
	}
}
