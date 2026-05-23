plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val eccofoodBaseUrl = providers.gradleProperty("ECCOFOOD_BASE_URL")
    .orElse("https://www.eccofoodapp.com")

android {
    namespace = "com.eccofood.taptopay"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.eccofood.taptopay"
        minSdk = 33
        targetSdk = 35
        versionCode = 9
        versionName = "0.3.3"
        buildConfigField("String", "ECCOFOOD_BASE_URL", "\"${eccofoodBaseUrl.get()}\"")
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
