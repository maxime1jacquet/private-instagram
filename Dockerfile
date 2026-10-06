# syntax=docker/dockerfile:1
ARG NODE_VERSION=24.15.0
ARG PB_VERSION=0.40.4

FROM node:${NODE_VERSION}-alpine AS front-deps
WORKDIR /app/front
COPY front/package.json front/package-lock.json ./
RUN npm ci

FROM front-deps AS front-dev
EXPOSE 4200
CMD ["npm", "run", "start", "--", "--host", "0.0.0.0", "--poll", "1000"]

FROM front-deps AS front-build
COPY front/ ./
RUN npm run build -- --configuration production

FROM alpine:3.23 AS pocketbase-download
ARG PB_VERSION
ARG TARGETARCH
RUN apk add --no-cache ca-certificates unzip \
    && case "$TARGETARCH" in amd64|arm64) ;; *) exit 1 ;; esac \
    && wget -q -O /tmp/pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" \
    && wget -q -O /tmp/checksums.txt "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/checksums.txt" \
    && checksum="$(awk -v file="pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" '$2 == file {print $1}' /tmp/checksums.txt)" \
    && test -n "$checksum" \
    && echo "$checksum  /tmp/pb.zip" | sha256sum -c - \
    && unzip /tmp/pb.zip pocketbase -d /pb

FROM alpine:3.23 AS api
RUN apk add --no-cache ca-certificates \
    && addgroup -g 10001 pocketbase \
    && adduser -D -u 10001 -G pocketbase pocketbase \
    && mkdir -p /pb/pb_data /pb/pb_hooks /pb/pb_migrations /pb/pb_public \
    && chown -R 10001:10001 /pb
WORKDIR /pb
COPY --from=pocketbase-download /pb/pocketbase /pb/pocketbase
COPY --chown=10001:10001 api/pb_hooks/ /pb/pb_hooks/
COPY --chown=10001:10001 api/pb_migrations/ /pb/pb_migrations/
COPY --chown=10001:10001 api/pb_public/ /pb/pb_public/
COPY --chmod=755 api/entrypoint.sh /usr/local/bin/pocketbase-entrypoint
ENV PORT=8080 PB_DEV=false PB_AUTOMIGRATE=false
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["pocketbase-entrypoint"]
CMD ["serve"]

# Default target: Angular's static production build served by PocketBase.
FROM api AS production
COPY --from=front-build --chown=10001:10001 /app/front/dist/front/browser/ /pb/pb_public/
