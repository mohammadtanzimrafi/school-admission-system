# syntax=docker/dockerfile:1

# ---- build: restore and publish the API -------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy only the project file first: the restored packages stay cached until it changes.
COPY src/SchoolAdmission.Api/SchoolAdmission.Api.csproj src/SchoolAdmission.Api/
RUN dotnet restore src/SchoolAdmission.Api/SchoolAdmission.Api.csproj

COPY src/ src/
RUN dotnet publish src/SchoolAdmission.Api/SchoolAdmission.Api.csproj \
    --configuration Release --no-restore --output /app

# ---- test: `docker compose --profile test run --rm backend-tests` ------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS test
WORKDIR /src

COPY src/SchoolAdmission.Api/SchoolAdmission.Api.csproj src/SchoolAdmission.Api/
COPY tests/SchoolAdmission.Api.Tests/SchoolAdmission.Api.Tests.csproj tests/SchoolAdmission.Api.Tests/
RUN dotnet restore tests/SchoolAdmission.Api.Tests/SchoolAdmission.Api.Tests.csproj

COPY . .
RUN dotnet build tests/SchoolAdmission.Api.Tests/SchoolAdmission.Api.Tests.csproj --no-restore

# The tests need a PostgreSQL server; its address comes from TEST_DATABASE_CONNECTION.
CMD ["dotnet", "test", "tests/SchoolAdmission.Api.Tests/SchoolAdmission.Api.Tests.csproj", "--no-build", "--logger", "console;verbosity=normal"]

# ---- runtime: small image with only the published app (default target) -------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# Run as the unprivileged user that the .NET images provide.
USER $APP_UID
ENTRYPOINT ["dotnet", "SchoolAdmission.Api.dll"]
