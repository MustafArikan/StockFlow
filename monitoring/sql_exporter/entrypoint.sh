#!/bin/sh
set -e

# Generate the config file from template in a writable directory
sed "s/\${MSSQL_SA_PASSWORD}/$MSSQL_SA_PASSWORD/g" /etc/sql_exporter/sql_exporter.yml.template > /tmp/sql_exporter.yml

# Execute the main sql_exporter command
exec /bin/sql_exporter -config.file=/tmp/sql_exporter.yml
