import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signOut, type User } from 'firebase/auth';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import Papa from 'papaparse';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { auth, db } from '../../constants/firebaseConfig';
import { COLORS, FONTS, SHADOWS, SIZES } from '../../constants/theme.js';
import { fetchBookDetailsFromGoogleBooks } from '../../utils/googleBooksApi';
import { getAllUserBooks, convertToCSV, downloadCSV } from '../../utils/exportUtils';

// --- Dependencias de Autenticación ---
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as GoogleWebApp from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

export default function ProfileScreen() {
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [booksReadCount, setBooksReadCount] = useState(0);
  const [totalPagesRead, setTotalPagesRead] = useState(0);
  const [averagePagesPerBook, setAveragePagesPerBook] = useState(0);
  const [favoriteAuthor, setFavoriteAuthor] = useState('');
  const [genreDistribution, setGenreDistribution] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [importing, setImporting] = useState(false);
  const [booksByYear, setBooksByYear] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [showExportSuccessModal, setShowExportSuccessModal] = useState(false); // Nuevo estado para el modal de éxito de exportación
  const [showManageCSVModal, setShowManageCSVModal] = useState(false); // Nuevo estado para el modal de gestión de CSV
  const router = useRouter();

  // --- Lógica de Autenticación Multiplataforma ---
  const [request, response, promptAsync] = GoogleWebApp.useIdTokenAuthRequest({
    clientId: '66446923656-vj6gcr0gkdt06etvjl157nkci74o5iuf.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (Platform.OS === 'android') {
      GoogleSignin.configure({
        webClientId: '66446923656-vj6gcr0gkdt06etvjl157nkci74o5iuf.apps.googleusercontent.com',
      });
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential);
    }
  }, [response]);

  const handleLogin = async () => {
    setLoading(true);
    if (Platform.OS === 'android') {
      try {
        await GoogleSignin.hasPlayServices();
        const { data } = await GoogleSignin.signIn();
        const credential = GoogleAuthProvider.credential(data.idToken);
        await signInWithCredential(auth, credential);
      } catch (error) {
        console.error("Error en inicio de sesión nativo:", error);
        setLoading(false);
      }
    } else {
      await promptAsync();
    }
  };

  const handleSignOut = async () => {
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.signOut();
      }
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  // --- Fin de la Lógica de Autenticación ---

  const getBroaderGenre = (genre) => {
    const g = genre.toLowerCase();
    if (g.includes('fantasy') || g.includes('fantasía')) return 'Fantasía';
    if (g.includes('science fiction') || g.includes('ciencia ficción') || g.includes('dystopian') || g.includes('distopía')) return 'Ciencia Ficción';
    if (g.includes('mystery') || g.includes('thriller') || g.includes('misterio') || g.includes('suspense') || g.includes('horror') || g.includes('terror')) return 'Misterio, Thriller y Terror';
    if (g.includes('fiction') || g.includes('ficción') || g.includes('novela') || g.includes('literatura') || g.includes('contemporary') || g.includes('histórica')) return 'Ficción General';
    if (g.includes('non-fiction') || g.includes('no ficción') || g.includes('history') || g.includes('historia') || g.includes('biography') || g.includes('biografía') || g.includes('science') || g.includes('ciencia') || g.includes('psychology') || g.includes('psicología') || g.includes('philosophy') || g.includes('filosofía') || g.includes('business') || g.includes('negocios')) return 'No Ficción';
    return 'Otros';
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserInfo(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchReadingStats = async () => {
    if (userInfo) {
      try {
        const q = query(
          collection(db, 'books'),
          where('userId', '==', userInfo.uid)
        );
        const querySnapshot = await getDocs(q);
        let readCount = 0;
        let totalPages = 0;
        let booksWithPages = 0;
        const authorCounts = {};
        const broadGenreCounts = {};
        let totalRating = 0;
        let ratedBooksCount = 0;
        const yearlyBooks = {};

        querySnapshot.forEach((doc) => {
          const book = { ...doc.data(), id: doc.id };
          if (book.listName === 'Terminados') {
            readCount++;
            if (book.author) {
              authorCounts[book.author] = (authorCounts[book.author] || 0) + 1;
            }
            if (book.categories && book.categories.length > 0) {
              const category = book.categories[0];
              const broadGenre = getBroaderGenre(category);
              broadGenreCounts[broadGenre] = (broadGenreCounts[broadGenre] || 0) + 1;
            }
            if (book.rating && book.rating > 0) {
              totalRating += book.rating;
              ratedBooksCount++;
            }
            if (book.totalPages && typeof book.totalPages === 'number') {
              totalPages += book.totalPages;
              booksWithPages++;
            }

            const finishedDate = book.finishDate?.toDate() || book.lastDateRead?.toDate() || book.dateAdded?.toDate();
            if (finishedDate) {
              const year = finishedDate.getFullYear();
              if (!yearlyBooks[year]) {
                yearlyBooks[year] = [];
              }
              yearlyBooks[year].push(book);
            }
          }
        });

        // Sort books within each year by finish date
        for (const year in yearlyBooks) {
          yearlyBooks[year].sort((a, b) => {
            const dateA = a.finishDate?.toDate() || a.lastDateRead?.toDate() || a.dateAdded?.toDate();
            const dateB = b.finishDate?.toDate() || b.lastDateRead?.toDate() || b.dateAdded?.toDate();
            return dateB - dateA; // Sort descending (most recent first)
          });
        }

        setBooksByYear(yearlyBooks);

        setBooksReadCount(readCount);
        setTotalPagesRead(totalPages);
        setAveragePagesPerBook(booksWithPages > 0 ? (totalPages / booksWithPages).toFixed(0) : 0);
        setAverageRating(ratedBooksCount > 0 ? (totalRating / ratedBooksCount).toFixed(1) : 0);

        if (Object.keys(authorCounts).length > 0) {
          const favorite = Object.keys(authorCounts).reduce((a, b) => authorCounts[a] > authorCounts[b] ? a : b);
          setFavoriteAuthor(favorite);
        }

        if (Object.keys(broadGenreCounts).length > 0) {
          const chartData = Object.keys(broadGenreCounts).map((key, index) => ({
            key: key,
            name: key,
            population: broadGenreCounts[key],
            color: COLORS.pieChart[index % COLORS.pieChart.length],
            legendFontColor: COLORS.text,
            legendFontSize: 14,
          }));
          setGenreDistribution(chartData);
        }

      } catch (error) {
        console.error("Error fetching reading stats:", error);
      }
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchReadingStats();
    }, [userInfo]) // Depend on userInfo to refetch when user logs in
  );

  const handleImportCSV = async () => {
    if (!userInfo) {
      alert("Debes iniciar sesión para importar lecturas.");
      return;
    }

    setImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log("Importación de CSV cancelada.");
        setImporting(false);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const csvUri = result.assets[0].uri;
        const response = await fetch(csvUri);
        const csvText = await response.text();

        Papa.parse(csvText, {
          header: true,
          complete: async (results) => {
            const booksToImport = results.data.filter(row => Object.values(row).some(val => val));
            let importedCount = 0;
            let errorCount = 0;

            for (const row of booksToImport) {
              try {
                let mappedListName = 'Pendientes';
                if (row['Read Status'] === 'read') mappedListName = 'Terminados';
                else if (row['Read Status'] === 'currently-reading') mappedListName = 'Leyendo';
                else if (row['Read Status'] === 'abandonados') mappedListName = 'Abandonados';

                const googleBookDetails = await fetchBookDetailsFromGoogleBooks(row.Title, row.Authors, row['ISBN/UID']);

                const bookData = {
                  userId: userInfo.uid,
                  title: row.Title || '',
                  author: row.Authors || '',
                  isbn: row['ISBN/UID'] || '',
                  format: row.Format || '',
                  listName: mappedListName,
                  dateAdded: row['Date Added'] ? new Date(row['Date Added']) : new Date(),
                  lastDateRead: row['Last Date Read'] ? new Date(row['Last Date Read']) : null,
                  readCount: parseInt(row['Read Count']) || 0,
                  rating: parseFloat(row['Star Rating']) || 0,
                  review: row.Review || '',
                  contentWarnings: row['Content Warnings'] || '',
                  tags: row.Tags ? row.Tags.split(',').map(tag => tag.trim()) : [],
                  owned: row['Owned?'] === 'Yes',
                  coverUrl: googleBookDetails?.coverUrl || null,
                  totalPages: googleBookDetails?.totalPages || 0,
                  categories: googleBookDetails?.categories || [],
                  bookId: googleBookDetails?.bookId || null,
                };
                await addDoc(collection(db, 'books'), bookData);
                importedCount++;
              } catch (error) {
                console.error("Error al guardar el libro en Firebase:", row, error);
                errorCount++;
              }
            }
            alert(`Importación completada: ${importedCount} libros importados, ${errorCount} errores.`);
            setImporting(false);
            fetchReadingStats();
          },
          error: (error) => {
            console.error("Error al parsear CSV:", error.message);
            alert("Error al importar CSV: " + error.message);
            setImporting(false);
          },
        });
      }
    } catch (error) {
      console.error("Error al seleccionar o leer el archivo CSV:", error);
      alert("Error al importar CSV. Consulta la consola para más detalles.");
      setImporting(false);
    }
  };

  const handleExportBooks = async () => {
    if (!userInfo) {
      alert('Debes iniciar sesión para exportar tus lecturas.');
      return;
    }
    try {
      const allBooks = await getAllUserBooks(userInfo.uid);
      const csvString = convertToCSV(allBooks);
      await downloadCSV(csvString, 'mis_lecturas.csv');
      setShowExportSuccessModal(true); // Mostrar el modal de éxito
    } catch (error) {
      console.error('Error exporting books:', error);
      alert('No se pudieron exportar las lecturas.');
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={[COLORS.background, COLORS.secondary]} style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORS.background, COLORS.secondary]} style={styles.container}>
      {userInfo ? (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.profileContainer}>
            {userInfo?.photoURL && (
              <Image source={{ uri: userInfo.photoURL }} style={styles.profileImage} />
            )}
            <Text style={styles.profileText}>Bienvenido, {userInfo?.displayName || userInfo?.email}!</Text>
            <Text style={styles.profileEmail}>{userInfo?.email}</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{booksReadCount}</Text>
              <Text style={styles.statLabel}>Libros leídos</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalPagesRead}</Text>
              <Text style={styles.statLabel}>Páginas leídas</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{averagePagesPerBook}</Text>
              <Text style={styles.statLabel}>Promedio/libro</Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
                <Text style={styles.statValue}>{averageRating} ★</Text>
                <Text style={styles.statLabel}>Valoración Media</Text>
            </View>
            <TouchableOpacity style={styles.statBox} onPress={() => setModalVisible(true)}>
              <Text style={styles.statValue}>📖</Text>
              <Text style={styles.statLabel}>Historial Anual</Text>
            </TouchableOpacity>
          </View>

          {favoriteAuthor && (
            <View style={styles.favoriteAuthorContainer}>
              <Text style={styles.sectionTitle}>Autor Favorito</Text>
              <Text style={styles.favoriteAuthorText}>{favoriteAuthor}</Text>
            </View>
          )}

          {genreDistribution.length > 0 ? (
            <View style={styles.chartContainer}>
              <Text style={styles.sectionTitle}>Distribución por Género</Text>
              <View style={styles.chartAndLegendContainer}>
                <PieChart
                  data={genreDistribution}
                  width={(Dimensions.get('window').width - (SIZES.medium * 2)) / 3}
                  height={150}
                  chartConfig={{
                    backgroundColor: COLORS.secondary,
                    backgroundGradientFrom: COLORS.secondary,
                    backgroundGradientTo: COLORS.secondary,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    labelRadius: 0.5,
                    legendFontColor: COLORS.text,
                    legendFontSize: 14,
                  }}
                  accessor={"population"}
                  backgroundColor={"transparent"}
                  paddingLeft={"40"}
                  absolute
                  hasLegend={false}
                  style={{ marginRight: SIZES.small }}
                />
                <View style={styles.legendContainer}>
                  {genreDistribution.map((item, index) => (
                    <View key={index} style={styles.legendItem}>
                      <View style={[styles.legendColorBox, { backgroundColor: item.color }]} />
                      <Text style={styles.legendText}>{item.name} ({item.population})</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.chartContainer}>
              <Text style={styles.sectionTitle}>Distribución por Género</Text>
              <Text style={styles.noDataText}>No hay datos de género para mostrar. ¡Añade libros a {""}Terminados{""} para ver tus estadísticas!</Text>
            </View>
          )}

          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              setModalVisible(!modalVisible);
            }}
          >
            <View style={styles.centeredView}>
              <View style={styles.modalView}>
                {Platform.OS === 'web' ? (
                  <View style={{ flex: 1, width: '100%' }}>
                    {Object.keys(booksByYear).length > 0 ? (
                      <ScrollView style={{ width: '100%' }}>
                        <Text style={styles.sectionTitle}>Historial de Lectura Anual</Text>
                        {Object.keys(booksByYear).sort((a, b) => b - a).map(year => (
                          <View key={year} style={styles.yearContainer}>
                            <Text style={styles.yearHeader}>{year} ({booksByYear[year].length} libros)</Text>
                            <FlatList
                              data={booksByYear[year]}
                              renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => router.push({ pathname: 'details', params: { bookId: item.bookId } })}>
                                  <Image source={{ uri: item.coverUrl.replace('http://', 'https://') }} style={styles.bookCover} />
                                </TouchableOpacity>
                              )}
                              keyExtractor={item => item.id}
                              horizontal
                              showsHorizontalScrollIndicator={false}
                            />
                          </View>
                        ))}
                      </ScrollView>
                    ) : (
                      <Text style={styles.noDataText}>No hay libros leídos.</Text>
                    )}
                  </View>
                ) : (
                  <>
                    {Object.keys(booksByYear).length > 0 ? (
                      <ScrollView>
                        <Text style={styles.sectionTitle}>Historial de Lectura Anual</Text>
                        {Object.keys(booksByYear).sort((a, b) => b - a).map(year => (
                          <View key={year} style={styles.yearContainer}>
                            <Text style={styles.yearHeader}>{year} ({booksByYear[year].length} libros)</Text>
                            <FlatList
                              data={booksByYear[year]}
                              renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => router.push({ pathname: 'details', params: { bookId: item.bookId } })}>
                                  <Image source={{ uri: item.coverUrl.replace('http://', 'https://') }} style={styles.bookCover} />
                                </TouchableOpacity>
                              )}
                              keyExtractor={item => item.id}
                              horizontal
                              showsHorizontalScrollIndicator={false}
                            />
                          </View>
                        ))}
                      </ScrollView>
                    ) : (
                      <Text style={styles.noDataText}>No hay libros leídos.</Text>
                    )}
                  </>
                )}
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => setModalVisible(!modalVisible)}
                >
                  <Text style={styles.buttonText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Modal de Éxito de Exportación */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={showExportSuccessModal}
            onRequestClose={() => setShowExportSuccessModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={[styles.modalTitle, { fontSize: SIZES.extraLarge, marginBottom: SIZES.medium }]}>¡Exportación Exitosa!</Text>
                <Text style={styles.modalSubtitle}>Tus lecturas han sido exportadas correctamente a un archivo CSV.</Text>
                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={() => setShowExportSuccessModal(false)}
                >
                  <Text style={styles.modalOptionButtonText}>Aceptar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <TouchableOpacity style={styles.button} onPress={() => setShowManageCSVModal(true)}>
            <Text style={styles.buttonText}>Gestionar Lecturas (CSV)</Text>
          </TouchableOpacity>
          {/* Modal de Gestión de CSV */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={showManageCSVModal}
            onRequestClose={() => setShowManageCSVModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Gestionar Lecturas CSV</Text>
                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={() => {
                    setShowManageCSVModal(false);
                    handleImportCSV();
                  }}
                >
                  {importing ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.modalOptionButtonText}>Importar Lecturas</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={() => {
                    setShowManageCSVModal(false);
                    handleExportBooks();
                  }}
                >
                  <Text style={styles.modalOptionButtonText}>Exportar Lecturas</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalOptionButton, { backgroundColor: COLORS.lightText, marginTop: SIZES.medium }]}
                  onPress={() => setShowManageCSVModal(false)}
                >
                  <Text style={styles.modalOptionButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <TouchableOpacity style={styles.button} onPress={handleSignOut}>
            <Text style={styles.buttonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.signInText}>Inicia sesión para acceder a tu perfil.</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={Platform.OS === 'web' && !request}
          >
            <Text style={styles.buttonText}>Iniciar Sesión con Google</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    padding: SIZES.medium,
  },
  profileContainer: {
    alignItems: 'center',
    padding: SIZES.large,
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.medium,
    ...SHADOWS.medium,
    width: '100%',
    marginBottom: SIZES.large,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: SIZES.medium,
  },
  profileText: {
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SIZES.small,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.lightText,
    marginBottom: SIZES.medium,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: SIZES.large,
  },
  statBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    padding: SIZES.medium,
    borderRadius: SIZES.medium,
    width: '30%',
    ...SHADOWS.medium,
  },
  statValue: {
    fontSize: SIZES.xLarge,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: SIZES.small,
    fontFamily: FONTS.regular,
    color: COLORS.lightText,
    marginTop: SIZES.base,
    textAlign: 'center',
  },
  favoriteAuthorContainer: {
    marginTop: SIZES.medium,
    backgroundColor: COLORS.secondary,
    padding: SIZES.medium,
    borderRadius: SIZES.medium,
    width: '100%',
    alignItems: 'center',
    ...SHADOWS.medium,
    marginBottom: SIZES.large,
  },
  sectionTitle: {
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SIZES.medium,
  },
  favoriteAuthorText: {
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    color: COLORS.primary,
  },
  chartContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.medium,
    padding: SIZES.medium,
    width: '100%',
    ...SHADOWS.medium,
  },
  chartAndLegendContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
  },
  signInText: {
    fontSize: SIZES.large,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    marginBottom: SIZES.medium,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.medium,
  },
  loadingText: {
    marginTop: SIZES.small,
    fontSize: SIZES.font,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: SIZES.medium,
    borderRadius: SIZES.small,
    alignItems: 'center',
    marginTop: SIZES.medium,
    ...SHADOWS.medium,
  },
  buttonText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: SIZES.medium,
  },
  noDataText: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.lightText,
    textAlign: 'center',
    padding: SIZES.large,
  },
  yearlyContainer: {
    width: '100%',
    marginTop: SIZES.large,
  },
  yearHeader: {
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SIZES.medium,
  },
  yearContainer: {
    width: '100%',
    marginBottom: SIZES.large,
  },
  bookCover: {
    width: 100,
    height: 150,
    borderRadius: SIZES.small,
    marginRight: SIZES.medium,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '80%'
  },
  buttonClose: {
    backgroundColor: COLORS.primary,
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },
  legendContainer: {
    flex: 2,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: SIZES.medium,
    width: ((Dimensions.get('window').width - (SIZES.medium * 2)) / 3) * 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.small,
  },
  legendColorBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: SIZES.base,
  },
  legendText: {
    color: COLORS.text,
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    flexShrink: 1,
  },
  modalTitle: {
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SIZES.medium,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.lightText,
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
    ...SHADOWS.medium,
  },
  modalOptionButton: {
    backgroundColor: COLORS.primary,
    padding: SIZES.medium,
    borderRadius: SIZES.small,
    alignItems: 'center',
    marginBottom: SIZES.small,
  },
  modalOptionButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: SIZES.medium,
  },
});