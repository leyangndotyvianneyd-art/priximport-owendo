import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Clé de signature officielle (voir mobile/android/key.properties.example).
// Tant que key.properties n'existe pas, la version release est signée avec
// la clé de test — suffisant pour installer l'APK à la main, pas pour le Play Store.
val keyProperties = Properties()
val keyPropertiesFile = rootProject.file("key.properties")
if (keyPropertiesFile.exists()) {
    keyPropertiesFile.inputStream().use { keyProperties.load(it) }
}

// Les 9 magasins Prix Import (data/stores.json, à la racine du site) : une
// appli par magasin, avec son propre nom et son propre identifiant, pour
// qu'elles puissent être installées côte à côte et publiées séparément.
//   flutter run --flavor golf
//   flutter build apk --release --flavor golf --dart-define=API_URL=https://...
@Suppress("UNCHECKED_CAST")
val stores = groovy.json.JsonSlurper()
    .parse(rootProject.file("../../data/stores.json")) as List<Map<String, Any?>>

android {
    namespace = "com.priximportowendo.priximport_owendo_mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.priximportowendo.priximport_owendo_mobile"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    flavorDimensions += "store"
    productFlavors {
        for (store in stores) {
            val id = store["id"] as String
            create(id) {
                dimension = "store"
                // Owendo garde l'identifiant de l'appli déjà installée.
                applicationId = if (id == "owendo") {
                    "com.priximportowendo.priximport_owendo_mobile"
                } else {
                    "ga.priximport." + id.replace("-", "")
                }
                manifestPlaceholders["appName"] = store["name"] as String
            }
        }
    }

    signingConfigs {
        if (keyPropertiesFile.exists()) {
            create("release") {
                keyAlias = keyProperties["keyAlias"] as String
                keyPassword = keyProperties["keyPassword"] as String
                storeFile = file(keyProperties["storeFile"] as String)
                storePassword = keyProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (keyPropertiesFile.exists()) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
