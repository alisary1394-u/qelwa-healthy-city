# ===== نظام المدينة الصحية - ASP.NET Core 8 + VB.NET =====

# ===== مرحلة البناء =====
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY webapp/webapp.vbproj ./webapp/
RUN dotnet restore webapp/webapp.vbproj

COPY webapp/ ./webapp/
RUN dotnet publish webapp/webapp.vbproj \
    -c Release \
    -o /app/publish \
    --no-restore

# ===== مرحلة التشغيل =====
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
RUN mkdir -p /data && chmod 755 /data
COPY --from=build /app/publish .
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_RUNNING_IN_CONTAINER=true
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "webapp.dll"]

