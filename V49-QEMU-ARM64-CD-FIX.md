# V49 QEMU ARM64 CD device fix

The ARM64 `virt` machine does not provide an IDE bus. The cloud-init seed ISO is therefore attached through `virtio-scsi-pci` + `scsi-cd` rather than `ide-cd`. The Kali disk remains boot index 1 and the seed remains boot index 2.
