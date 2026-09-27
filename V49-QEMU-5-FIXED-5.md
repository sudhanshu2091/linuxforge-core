# V49 QEMU Fixed-5

## Boot-path correction

The ARM64 Kali guest is launched with the root qcow2 attached using QEMU's native `if=virtio` drive path. This matches the manually proven Apple Silicon boot path and avoids the explicit `virtio-blk-pci` attachment that was not being discovered correctly by the guest UEFI/GRUB path.

The cloud-init seed remains a separate read-only SCSI CD-ROM. UEFI boot ordering remains explicit.

This change does not alter V44 control-plane, V45 isolation, V46 lab topology, V47 assessment, or V48 scenario responsibilities.


## Fixed-8 boot correction
The macOS ARM64 QEMU provider now boots an independent per-environment clone of the official Kali ARM64 qcow2 image using the proven virtio root-disk + CD-ROM cloud-init attachment. This avoids the UEFI/GRUB module lookup failure observed with the previous backing-overlay/explicit virtio device path. Production providers remain free to use storage-native copy-on-write.
