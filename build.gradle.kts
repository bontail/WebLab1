plugins {
    id("java")
    application
    id("com.github.johnrengelman.shadow") version "8.1.1"
}

group = "bontail"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
}

dependencies {
    testImplementation(platform("org.junit:junit-bom:5.10.0"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    implementation(files("fastcgi-lib.jar"))
    implementation("com.fasterxml.jackson.core:jackson-databind:2.0.1")
}

// Configure the shadowJar task to create a fat JAR
tasks.named<com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar>("shadowJar") {
    archiveClassifier.set("")
    manifest {
        attributes["Main-Class"] = "FastCGIServer"
    }
}

tasks {
    build {
        dependsOn(shadowJar)
    }
}

application {
    mainClass.set("FastCGIServer")
}

tasks.test {
    useJUnitPlatform()
}

tasks.named("distZip") {
    dependsOn("shadowJar")
}

tasks.named("distTar") {
    dependsOn("shadowJar")
}

tasks.named("startScripts") {
    dependsOn("shadowJar")
}

tasks.named("startShadowScripts") {
    dependsOn("jar")
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}
