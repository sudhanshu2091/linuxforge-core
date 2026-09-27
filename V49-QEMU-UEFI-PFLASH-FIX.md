# V49 QEMU UEFI pflash fix

## Why this change exists

Physical ARM64 Kali boot testing reached GRUB but stopped at:

`error: file '/boot/grub/arm64-efi/normal.mod' not found.`

The runtime previously supplied only the AArch64 UEFI code image through QEMU's `-bios` option. QEMU/edk2 publishes separate AArch64 UEFI code and variable-store images, and QEMU's UEFI documentation describes persistent variable storage as a pflash device. The V49 runtime now uses that layout and gives every environment its own writable EFI variable-store copy.

## Runtime behavior

- Discover both UEFI code and variable-store template.
- Homebrew Apple Silicon default:
  - `edk2-aarch64-code.fd`
  - `edk2-arm-vars.fd`
- Copy the variable-store template to `<environment>/efi-vars.fd`.
- Attach code as read-only pflash unit 0.
- Attach the per-environment vars file as writable pflash unit 1.
- Never share a writable EFI vars file between environments.
- Explicit overrides are available through:
  - `FORGE_QEMU_UEFI_CODE`
  - `FORGE_QEMU_UEFI_VARS_TEMPLATE`

This keeps the VM firmware state isolated per learner/lab environment.
