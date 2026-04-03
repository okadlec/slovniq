import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/src/stores/useAppStore';
import { getOfferings } from '@/src/services/IAPManager';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/src/config/ThemeContext';

export default function PaywallScreen() {
  const router = useRouter();
  const purchasePro = useAppStore((s) => s.purchasePro);
  const restorePurchases = useAppStore((s) => s.restorePurchases);
  const { colors } = useTheme();
  const [price, setPrice] = useState<string>('...');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const offering = await getOfferings();
      if (offering?.availablePackages[0]) {
        setPrice(offering.availablePackages[0].product.priceString);
      } else {
        setPrice('199 Kč');
      }
    })();
  }, []);

  const handlePurchase = async () => {
    setLoading(true);
    const success = await purchasePro();
    setLoading(false);
    if (success) {
      Alert.alert(
        'Vítejte v SlovníQ PRO!',
        'Máte odemčené všechny slovníky a žádné reklamy. Děkujeme za nákup!',
        [{ text: 'Výborně', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Chyba', 'Nákup se nezdařil. Zkuste to znovu.');
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    const success = await restorePurchases();
    setLoading(false);
    if (success) {
      Alert.alert('Hotovo', 'Nákup byl úspěšně obnoven!');
      router.back();
    } else {
      Alert.alert('Nenalezeno', 'Nebyl nalezen žádný předchozí nákup.');
    }
  };

  const features = [
    { icon: 'globe-outline' as const, text: 'Všech 20 jazykových slovníků' },
    { icon: 'eye-off-outline' as const, text: 'Bez reklam' },
    { icon: 'infinite-outline' as const, text: 'Jednorázová platba — navždy' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.badge}>
        <Ionicons name="diamond" size={48} color={colors.accent} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>SlovníQ PRO</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Odemkněte plnou verzi navždy</Text>

      <View style={styles.features}>
        {features.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon} size={20} color={colors.success} />
            </View>
            <Text style={[styles.featureText, { color: colors.text }]}>{f.text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.buyButton, { backgroundColor: colors.primary }]}
        onPress={handlePurchase}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buyText}>Koupit za {price}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleRestore} disabled={loading}>
        <Text style={[styles.restoreText, { color: colors.primary }]}>Obnovit nákup</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    marginBottom: 32,
  },
  features: {
    width: '100%',
    marginBottom: 32,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
  },
  buyButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  buyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  restoreText: {
    fontSize: 14,
  },
});
