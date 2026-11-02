# Multi-stage Dockerfile for Bifrost gateway with FreshGate plugin
FROM golang:1.22-alpine AS builder

WORKDIR /build

RUN apk add --no-cache git make gcc musl-dev

# Copy plugin source
COPY plugin/freshgate/ /build/plugins/freshgate/
COPY shared/ /build/shared/

# Download and build plugin
WORKDIR /build/plugins/freshgate
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -v -o /build/bin/freshgate-plugin .

FROM alpine:3.20

RUN apk add --no-cache ca-certificates curl jq

WORKDIR /app

COPY --from=builder /build/bin/freshgate-plugin /app/freshgate-plugin
COPY deploy/bifrost/config.json /etc/bifrost/config.json
COPY shared/ /app/shared/

EXPOSE 8080

ENTRYPOINT ["/app/freshgate-plugin"]
