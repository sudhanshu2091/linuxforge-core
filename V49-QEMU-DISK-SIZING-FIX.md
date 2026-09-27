# V49 QEMU Disk Sizing Fix

The QEMU runtime previously attempted to resize every qcow2 overlay to the
configured `storageMiB`, including shrinking a 25 GiB Kali backing image to
the 20 GiB default. QEMU correctly rejects implicit shrinking because it can
discard data.

The runtime now:

- reads the overlay virtual size with `qemu-img info --output=json`;
- treats the existing virtual size as the minimum effective disk size;
- never performs an automatic shrink;
- grows the overlay only when the requested size is larger;
- records the effective storage size in the environment descriptor;
- applies the same rule during environment reset.

Regression coverage includes both the 25 GiB -> 20 GiB no-shrink case and a
25 GiB -> 30 GiB growth case.
