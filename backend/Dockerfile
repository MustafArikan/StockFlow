FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["backend.csproj", "./"]
RUN dotnet restore "backend.csproj"
COPY . .
WORKDIR "/src"
RUN dotnet build "backend.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
USER root
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=publish /app/publish .
USER app
ENTRYPOINT ["dotnet", "backend.dll"]
