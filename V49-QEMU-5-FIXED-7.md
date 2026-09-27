# V49 QEMU-5 Fixed-7

Boot-device correction for Apple Silicon AArch64 UEFI.

- Kali root disk: explicit `virtio-blk-pci`, bootindex 1.
- NoCloud seed: explicit `virtio-blk-pci`, bootindex 2.
- Removed SCSI CD-ROM from the ARM64 path because the local AArch64 UEFI
  firmware was failing to enumerate the SCSI CD device and falling into its
  internal shell before reaching the Kali disk.
- Removed the invalid `boot=on` block option.
- No persistent NVRAM is introduced.
