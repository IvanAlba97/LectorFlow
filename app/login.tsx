
import React, { useState, useEffect } from 'react';
import { View, Text, Button, Image, StyleSheet, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleAuthProvider, signInWithCredential, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../constants/firebaseConfig'; // Ruta corregida para LectorFlow

// --- Dependencias Nativas (Android) ---
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// --- Dependencias Web ---
import * as GoogleWebApp from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

// Para la web, necesitamos cerrar la ventana del navegador después de la autenticación
if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

console.log(`[PLATFORM CHECK] Platform.OS detectado: ${Platform.OS}`);

export default function LoginScreen() {
  const [userInfo, setUserInfo] = useState(null);

  // --- Configuración para la Web ---
  const [request, response, promptAsync] = GoogleWebApp.useIdTokenAuthRequest({
    clientId: '66446923656-vj6gcr0gkdt06etvjl157nkci74o5iuf.apps.googleusercontent.com',
  });

  // --- Configuración para Android (Nativo) ---
  useEffect(() => {
    if (Platform.OS === 'android') {
      GoogleSignin.configure({
        webClientId: '66446923656-vj6gcr0gkdt06etvjl157nkci74o5iuf.apps.googleusercontent.com',
      });
    }
  }, []);

  // --- Efecto para manejar la respuesta de la autenticación web ---
  useEffect(() => {
    if (Platform.OS === 'web' && response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential);
    }
  }, [response]);

  // --- Efecto para manejar el estado de autenticación de Firebase (común a ambas plataformas) ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserInfo(user);
      } else {
        setUserInfo(null);
      }
    });
    return () => unsub();
  }, []);

  // --- Lógica de Inicio de Sesión ---
  const handleLogin = async () => {
    console.log(`[FORCE NATIVE] Plataforma: ${Platform.OS}. Forzando flujo nativo.`);

    // Forzamos la ejecución del código nativo de Android
    try {
      await GoogleSignin.hasPlayServices();
      const { data } = await GoogleSignin.signIn();
      if (!data.idToken) {
        throw new Error("El idToken de Google es nulo.");
      }
      const credential = GoogleAuthProvider.credential(data.idToken);
      await signInWithCredential(auth, credential);
    } catch (error) {
      console.error('[DEBUG] Error en flujo nativo forzado:', error);
      Alert.alert("Error Nativo", error.message);
    }
  };

  // --- Lógica de Cierre de Sesión ---
  const handleLogout = async () => {
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.signOut();
      }
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión', error);
    }
  };

  return (
    <View style={styles.container}>
      {userInfo ? (
        <View style={styles.userInfoContainer}>
          <Image source={{ uri: userInfo.photoURL }} style={styles.profileImage} />
          <Text style={styles.welcomeText}>¡Bienvenido, {userInfo.displayName}!</Text>
          <Text style={styles.emailText}>{userInfo.email}</Text>
          <Button title="Cerrar Sesión" onPress={handleLogout} />
        </View>
      ) : (
        <Button
          title="PÚLSAME PARA LA PRUEBA"
          onPress={handleLogin}
          disabled={Platform.OS === 'web' && !request}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoContainer: {
    alignItems: 'center',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emailText: {
    fontSize: 16,
    marginBottom: 20,
  },
});
