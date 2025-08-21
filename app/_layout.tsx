import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/theme';


export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="details" options={{ headerShown: true, title: 'Detalles del Libro', headerTransparent: false, headerStyle: { backgroundColor: COLORS.background }, animationEnabled: true, animation: 'slide_from_right' }} />
        <Stack.Screen
          name="reading-list/[listName]"
          options={{
            headerShown: true,
            title: 'Lista de Lectura',
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 250, // Reducido a la mitad (de 500ms a 250ms)
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 250, // Reducido a la mitad (de 500ms a 250ms)
                },
              },
            },
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" translucent={false} backgroundColor={COLORS.background} />
    </>
  );
}