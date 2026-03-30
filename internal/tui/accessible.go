package tui

// AccessibilityConfig holds the three accessibility flags.
// These are populated from CLI flags and thread through the entire TUI.
type AccessibilityConfig struct {
	// Accessible enables screen-reader mode: linear flow, huh.WithAccessible.
	Accessible bool

	// HighContrast forces 4-bit ANSI colours only.
	HighContrast bool

	// ReduceMotion disables all spring animations and confetti.
	ReduceMotion bool
}

// NewAccessibilityConfig creates a config from the parsed CLI flags.
func NewAccessibilityConfig(accessible, highContrast, reduceMotion bool) AccessibilityConfig {
	return AccessibilityConfig{
		Accessible:   accessible,
		HighContrast: highContrast,
		ReduceMotion: reduceMotion,
	}
}

// ShouldAnimate returns false when any accessibility flag suppresses motion.
func (a AccessibilityConfig) ShouldAnimate() bool {
	return !a.ReduceMotion && !a.Accessible
}

// ShouldShowConfetti returns false in accessible or reduce-motion modes.
func (a AccessibilityConfig) ShouldShowConfetti() bool {
	return !a.ReduceMotion && !a.Accessible
}
