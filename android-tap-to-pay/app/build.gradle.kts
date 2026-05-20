plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val eccofoodBaseUrl = providers.gradleProperty("ECCOFOOD_BASE_URL")
    .orElse("https://eccofood.app")
val eccofoodStartPath = providers.gradleProperty("ECCOFOOD_START_PATH")
    .orElse("/login")

android {
    namespace = "com.eccofood.taptopay"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.eccofood.taptopay"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "ECCOFOOD_BASE_URL", "\"${eccofoodBaseUrl.get()}\"")
        buildConfigField("String", "ECCOFOOD_START_PATH", "\"${eccofoodStartPath.get()}\"")
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("com.stripe:stripeterminal-core:5.5.0")
    implementation("com.stripe:stripeterminal-taptopay:5.5.0")
}
