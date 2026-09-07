import React from 'react';
import { scheduleGoalNotifications, sendInstantTestNotification } from '../services/notificationService';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../store/userStore';

export const ProfileScreen = () => {
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);
  const deleteAccount = useUserStore((state) => state.deleteAccount);

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: () => {
            clearUser();
          },
        },
      ]
    );
  };

  // Apple Guideline 5.1.1 Uyumlu Kalıcı Hesap Silme Aksiyonu
  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabını ve Verilerini Sil',
      'Tüm beslenme geçmişin, makro hedeflerin ve kişisel verilerin kalıcı olarak silinecektir. Bu işlem geri alınamaz. Devam etmek istiyor musun?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kalıcı Olarak Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              Alert.alert('Hesap Silindi', 'Hesabınız ve ilişkili tüm verileriniz başarıyla temizlendi.');
            } catch (e: any) {
              Alert.alert('Hata', 'Hesap silinirken bir sorun oluştu: ' + (e?.message || 'Bilinmeyen hata'));
            }
          },
        },
      ]
    );
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'S';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Üst Başlık */}
        <View style={styles.header}>
          <Text style={styles.subHeader}>HESAP & AYARLAR</Text>
          <Text style={styles.title}>Profilim</Text>
        </View>

        {/* Profil Kartı (Avatar & Temel Bilgiler) */}
        <View style={styles.profileHeroCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
            <View style={styles.onlineBadge} />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user?.name || 'Kullanıcı'}</Text>
            <View style={styles.tagRow}>
              <View style={styles.goalTag}>
                <Ionicons name="flash" size={12} color="#10B981" />
                <Text style={styles.goalTagText}>{user?.goal || 'Kas Kazanımı'}</Text>
              </View>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>
                  {user?.is_premium ? 'FitIntel PRO' : 'Standart Üye'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Fiziksel İstatistik Rozetleri */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>BOY</Text>
            <Text style={styles.statValue}>
              {user?.height_cm || 180} <Text style={styles.statUnit}>cm</Text>
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>KİLO</Text>
            <Text style={styles.statValue}>
              {user?.weight_kg || 75} <Text style={styles.statUnit}>kg</Text>
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>YAŞ</Text>
            <Text style={styles.statValue}>
              {user?.age || 24} <Text style={styles.statUnit}>yaş</Text>
            </Text>
          </View>
        </View>

        {/* Tercihler Menü Grubu */}
        <Text style={styles.sectionTitle}>Beslenme & Tercihler</Text>
        <View style={styles.menuGroup}>
          <View style={styles.menuItem}>
            <View style={[styles.menuIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="wallet-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Aylık Yemek Bütçesi</Text>
              <Text style={styles.menuSubtitle}>
                ₺{user?.budget ? Number(user.budget).toLocaleString('tr-TR') : 'Belirtilmedi'} / ay
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </View>

          <View style={styles.divider} />

          <View style={styles.menuItem}>
            <View style={[styles.menuIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="nutrition-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Tüketilmeyen Besinler</Text>
              <Text style={styles.menuSubtitle}>
                {user?.disliked_foods && user.disliked_foods.length > 0
                  ? Array.isArray(user.disliked_foods)
                    ? user.disliked_foods.join(', ')
                    : user.disliked_foods
                  : 'Belirtilmedi'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </View>
        </View>

        <TouchableOpacity
          style={styles.menuItem}
          activeOpacity={0.7}
          onPress={async () => {
            await scheduleGoalNotifications(user?.goal);
            await sendInstantTestNotification(user?.goal);
            Alert.alert(
              '🔔 Bildirimler Aktif Edildi',
              `${user?.goal === 'weight_gain' ? 'Kilo Alma' : 'Hedefine'} özel kahvaltı (08:30), öğle (12:45), ara öğün (16:30) ve akşam (19:30) hatırlatıcıları kuruldu! Ekranına örnek bir test bildirimi gönderildi.`
            );
          }}
        >
          <View style={[styles.menuIconBox, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="notifications-outline" size={20} color="#10B981" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Bildirim Ayarları</Text>
            <Text style={styles.menuSubtitle}>Hedefine özel 4 öğün hatırlatıcısı</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* Genel Ayarlar Grubu */}
        <Text style={styles.sectionTitle}>Uygulama & Güvenlik</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.menuIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="notifications-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Bildirim Ayarları</Text>
              <Text style={styles.menuSubtitle}>Öğün ve su hatırlatıcıları</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.menuIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Gizlilik & Güvenlik</Text>
              <Text style={styles.menuSubtitle}>Veri yönetimi ve izinler</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Çıkış Yap Butonu */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <View style={styles.logoutIconBox}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          </View>
          <Text style={styles.logoutText}>Hesaptan Çıkış Yap</Text>
        </TouchableOpacity>

        {/* Hesabı ve Verileri Sil Butonu (Apple Guideline 5.1.1) */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          activeOpacity={0.8}
        >
          <View style={styles.deleteIconBox}>
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </View>
          <Text style={styles.deleteText}>Hesabımı ve Verilerimi Kalıcı Olarak Sil</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>FitIntel AI • v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 20,
  },
  subHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#064E3B',
    marginTop: 2,
  },
  profileHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#E2EFE7',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    borderWidth: 2,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#064E3B',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#064E3B',
    marginBottom: 6,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  goalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    gap: 4,
  },
  goalTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#064E3B',
  },
  roleTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2EFE7',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#064E3B',
  },
  statUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E2EFE7',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#064E3B',
  },
  menuSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F2',
    marginLeft: 68,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    marginTop: 6,
    gap: 8,
  },
  logoutIconBox: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#EF4444',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 12,
    gap: 6,
  },
  deleteIconBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 18,
  },
});

export default ProfileScreen;