# Script de Configuração do Maven Wrapper
$jarUrl = "https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar"
$wrapperDir = "backend/.mvn/wrapper"
$jarPath = "$wrapperDir/maven-wrapper.jar"

if (!(Test-Path $wrapperDir)) {
    New-Item -ItemType Directory -Path $wrapperDir -Force
}

Write-Host "Baixando Maven Wrapper JAR..."
Invoke-WebRequest -Uri $jarUrl -OutFile $jarPath

Write-Host "Configuração Concluída!"
Write-Host "Para rodar o backend, use o comando: cd backend; .\mvnw spring-boot:run"
Write-Host "IMPORTANTE: Você ainda precisa ter o JAVA (JDK 17 ou superior) instalado no computador."
