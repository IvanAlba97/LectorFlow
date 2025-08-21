import { LinearGradient } from 'expo-linear-gradient';
import { Link, useFocusEffect } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { auth, db } from '../../constants/firebaseConfig';
import { COLORS, FONTS, SHADOWS, SIZES } from '../../constants/theme';

LocaleConfig.locales['es'] = {
  monthNames: [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ],
  monthNamesShort: [
    'Ene.',
    'Feb.',
    'Mar.',
    'Abr.',
    'May.',
    'Jun.',
    'Jul.',
    'Ago.',
    'Sep.',
    'Oct.',
    'Nov.',
    'Dic.',
  ],
  dayNames: [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ],
  dayNamesShort: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

const HomeScreen = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDailyUpdatesModal, setShowDailyUpdatesModal] = useState(false);
  const [dailyReadingUpdates, setDailyReadingUpdates] = useState([]);
  const [allReadingActivities, setAllReadingActivities] = useState([]); // Nuevo estado

  useFocusEffect(
    React.useCallback(() => {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        setLoading(false);

        if (currentUser) {
          try {
            const q = query(
              collection(db, 'books'),
              where('userId', '==', currentUser.uid)
            );
            const querySnapshot = await getDocs(q);
          const dates = {};
          const allActivities = [];
          querySnapshot.forEach((doc) => {
            const book = doc.data();
            if (book.readingActivity && Array.isArray(book.readingActivity)) {
              book.readingActivity.forEach(activity => {
                const date = activity.date.toDate().toISOString().split('T')[0];
                dates[date] = { marked: true, dotColor: COLORS.primary };
                allActivities.push({
                  date: date,
                  title: book.title || 'Libro desconocido',
                  pagesAdvanced: activity.pagesAdvanced || 0,
                });
              });
            }
          });
          setMarkedDates(dates);
          setAllReadingActivities(allActivities);
          } catch (error) {
            console.error("Error fetching reading dates:", error);
          }
        }
      });
      return () => unsubscribe();
    }, [])
  );

  useEffect(() => {
    if (showDailyUpdatesModal && selectedDate && allReadingActivities.length > 0) {
      const filteredUpdates = allReadingActivities.filter(activity => activity.date === selectedDate);
      setDailyReadingUpdates(filteredUpdates);
    }
  }, [showDailyUpdatesModal, selectedDate, allReadingActivities]);

  if (loading) {
    return (
      <LinearGradient colors={[COLORS.background, COLORS.secondary]} style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORS.background, COLORS.secondary]} style={styles.container}>
      <View style={[styles.content]}>
        {user ? (
          <>
            <Text style={styles.title}>LectorFlow</Text>
            <Text style={styles.subtitle}>Aquí verás los libros que estás leyendo actualmente.</Text>
            <View style={styles.listContainer}>
              <Link href={{ pathname: '/reading-list/[listName]', params: { listName: 'Leyendo' } }} asChild>
                <Pressable style={styles.listItem}>
                  <Text style={styles.listItemText}>Leyendo</Text>
                </Pressable>
              </Link>
              <Link href={{ pathname: '/reading-list/[listName]', params: { listName: 'Pendientes' } }} asChild>
                <Pressable style={styles.listItem}>
                  <Text style={styles.listItemText}>Pendientes</Text>
                </Pressable>
              </Link>
              <Link href={{ pathname: '/reading-list/[listName]', params: { listName: 'Terminados' } }} asChild>
                <Pressable style={styles.listItem}>
                  <Text style={styles.listItemText}>Terminados</Text>
                </Pressable>
              </Link>
              <Link href={{ pathname: '/reading-list/[listName]', params: { listName: 'Abandonados' } }} asChild>
                <Pressable style={styles.listItem}>
                  <Text style={styles.listItemText}>Abandonados</Text>
                </Pressable>
              </Link>
            </View>

            <View style={styles.calendarContainer}>
              <Text style={styles.calendarTitle}>Mi Calendario de Lectura</Text>
              <Calendar
                markedDates={{
                  ...markedDates,
                  ...(selectedDate ? { [selectedDate]: { selected: true, marked: true, selectedColor: COLORS.primary } } : {}),
                }}
                markingType={'simple'}
                onDayPress={(day) => {
                  setSelectedDate(day.dateString);
                  setShowDailyUpdatesModal(true);
                }}
                firstDay={1} // Week starts on Monday
                theme={{
                  backgroundColor: COLORS.secondary,
                  calendarBackground: COLORS.secondary,
                  textSectionTitleColor: COLORS.text,
                  selectedDayBackgroundColor: COLORS.primary,
                  selectedDayTextColor: COLORS.white,
                  todayTextColor: COLORS.primary,
                  dayTextColor: COLORS.text,
                  textDisabledColor: COLORS.lightText,
                  dotColor: COLORS.primary,
                  selectedDotColor: COLORS.white,
                  arrowColor: COLORS.primary,
                  monthTextColor: COLORS.text,
                  textDayFontFamily: FONTS.regular,
                  textMonthFontFamily: FONTS.bold,
                  textDayHeaderFontFamily: FONTS.regular,
                  textDayFontSize: SIZES.font - 2, // Reduced font size
                  textMonthFontSize: SIZES.large,
                  textDayHeaderFontSize: SIZES.font - 2, // Reduced font size
                }}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>LectorFlow</Text>
            <Text style={styles.subtitle}>Inicia sesión para ver tus lecturas.</Text>
          </>
        )}
      </View>

      {/* Modal para las actualizaciones diarias */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showDailyUpdatesModal}
        onRequestClose={() => setShowDailyUpdatesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Actividad de Lectura ({selectedDate})</Text>
            {dailyReadingUpdates.length > 0 ? (
              <FlatList
                data={dailyReadingUpdates}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <View style={styles.dailyUpdateItem}>
                    <Text style={styles.dailyUpdateText}>{item.title} - {item.pagesAdvanced} páginas</Text>
                  </View>
                )}
              />
            ) : (
              <Text style={styles.noDailyUpdatesText}>No hay actividad de lectura para este día.</Text>
            )}
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setShowDailyUpdatesModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: SIZES.large,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: SIZES.extraLarge,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SIZES.medium,
  },
  subtitle: {
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    color: COLORS.lightText,
    textAlign: 'center',
    marginBottom: SIZES.large,
  },
  listContainer: {
    width: '80%',
    marginTop: SIZES.large,
  },
  listItem: {
    backgroundColor: COLORS.primary,
    padding: SIZES.medium,
    borderRadius: SIZES.small,
    alignItems: 'center',
    marginBottom: SIZES.medium,
    width: '100%',
    ...SHADOWS.medium,
  },
  listItemText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: SIZES.medium,
  },
  calendarContainer: {
    width: '100%',
    marginTop: SIZES.large,
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.small,
    padding: SIZES.medium,
    ...SHADOWS.medium,
  },
  calendarTitle: {
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SIZES.medium,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.small,
    padding: SIZES.large,
    width: '80%',
    maxHeight: '70%',
    ...SHADOWS.medium,
  },
  modalTitle: {
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SIZES.medium,
    textAlign: 'center',
  },
  dailyUpdateItem: {
    paddingVertical: SIZES.small,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightText,
  },
  dailyUpdateText: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  noDailyUpdatesText: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.lightText,
    textAlign: 'center',
    marginTop: SIZES.medium,
  },
  modalCloseButton: {
    backgroundColor: COLORS.primary,
    padding: SIZES.medium,
    borderRadius: SIZES.small,
    alignItems: 'center',
    marginTop: SIZES.large,
  },
  modalCloseButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: SIZES.medium,
  },
});

export default HomeScreen;
