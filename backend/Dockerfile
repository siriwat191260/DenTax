FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY DentaLedger.API/DentaLedger.API.csproj DentaLedger.API/
RUN dotnet restore DentaLedger.API/DentaLedger.API.csproj
COPY . .
RUN dotnet publish DentaLedger.API/DentaLedger.API.csproj -c Release -o /app/out

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/out .
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000
ENTRYPOINT ["dotnet", "DentaLedger.API.dll"]
