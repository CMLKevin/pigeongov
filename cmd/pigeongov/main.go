package main

import (
	"fmt"
	"os"

	"pigeongov/internal/tui"
)

func main() {
	if err := tui.Run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
