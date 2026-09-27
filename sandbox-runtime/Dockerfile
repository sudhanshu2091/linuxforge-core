FROM kalilinux/kali-rolling
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends python3 bash zsh dash coreutils procps iproute2 ca-certificates vim-tiny less proot && rm -rf /var/lib/apt/lists/* \
    && useradd -m -s /bin/bash learner \
    && mkdir -p /var/lib/linuxforge-snapshots /var/lib/linuxforge-environments \
    && chown -R learner:learner /home/learner /var/lib/linuxforge-snapshots /var/lib/linuxforge-environments
COPY server.py /opt/linuxforge/server.py
RUN chmod 755 /opt/linuxforge/server.py
USER learner
WORKDIR /home/learner
EXPOSE 8080
CMD ["python3", "/opt/linuxforge/server.py"]
