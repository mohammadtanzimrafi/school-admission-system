using SchoolAdmission.Api;

var app = AdmissionApp.Build(args);

await app.InitialiseDatabaseAsync();
await app.RunAsync();
