buildscript {
    repositories {
        google()
        mavenCentral()
    }

    dependencies {
        classpath("com.google.gms:google-services:4.4.2")
        classpath("com.google.firebase:firebase-crashlytics-gradle:3.0.2")
        // Needed only to reference com.android.build.gradle.BaseExtension below, for the
        // AGP8 "missing namespace" workaround. AGP itself is otherwise resolved via the
        // declarative plugins {} block in settings.gradle.kts.
        classpath("com.android.tools.build:gradle:8.11.1")
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

// Workaround for third-party plugins (from pub.dev) whose own android/build.gradle predates
// AGP 8 and therefore doesn't declare a `namespace`, which AGP 8 requires. Instead of a manifest
// `package` attribute, patch the namespace in from that same manifest at configuration time.
// See: https://d.android.com/r/tools/upgrade-assistant/set-namespace
subprojects {
    afterEvaluate {
        val androidExtension = extensions.findByType(com.android.build.gradle.BaseExtension::class.java)
        if (androidExtension != null && androidExtension.namespace == null) {
            val manifestFile = file("src/main/AndroidManifest.xml")
            if (manifestFile.exists()) {
                val packageMatch = Regex("package=\"([^\"]+)\"").find(manifestFile.readText())
                if (packageMatch != null) {
                    androidExtension.namespace = packageMatch.groupValues[1]
                }
            }
        }
    }
}

rootProject.buildDir = file("../build")
subprojects {
    buildDir = file("${rootProject.buildDir}/${project.name}")
    evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.buildDir)
}
