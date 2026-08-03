#!/bin/sh
set -e

# Install gettext to use envsubst
apk add --no-cache gettext

# Generate the config file from template in a writable directory
envsubst < /etc/sql_exporter/sql_exporter.yml.template > /tmp/sql_exporter.yml

# Execute the main sql_exporter command
exec /bin/sql_exporter -config.file=/tmp/sql_exporter.yml
