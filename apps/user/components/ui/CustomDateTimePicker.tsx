import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import { Calendar, Clock, X, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const PURPLE = '#240080';
const PURPLE_LIGHT = '#F3E8FF';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const TEXT_DISABLED = '#D1D5DB';
const BORDER = '#EFEFEF';

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Generate arrays
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const generateDays = (month: number, year: number) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => i + 1);
};

const generateYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 3 }, (_, i) => currentYear + i);
};

const generateHours = () => Array.from({ length: 24 }, (_, i) => i);
const generateMinutes = () => Array.from({ length: 12 }, (_, i) => i * 5);

// Wheel Column Component
const WheelColumn = ({
  data,
  selectedIndex,
  onSelect,
  formatItem,
  width,
  disabledIndices = [],
}: {
  data: number[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  formatItem: (item: number) => string;
  width: number;
  disabledIndices?: number[];
}) => {
  const flatListRef = useRef<FlatList>(null);

  // Find nearest enabled index
  const findNearestEnabled = useCallback((index: number): number => {
    if (!disabledIndices.includes(index)) return index;
    // Search forward first, then backward
    for (let offset = 1; offset < data.length; offset++) {
      if (index + offset < data.length && !disabledIndices.includes(index + offset)) {
        return index + offset;
      }
      if (index - offset >= 0 && !disabledIndices.includes(index - offset)) {
        return index - offset;
      }
    }
    return index;
  }, [disabledIndices, data.length]);

  useEffect(() => {
    if (flatListRef.current && selectedIndex >= 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: selectedIndex * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
    }
  }, []);

  const handleScrollEnd = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
    
    // Snap to nearest enabled index if disabled
    const validIndex = findNearestEnabled(clampedIndex);
    
    if (validIndex !== selectedIndex) {
      onSelect(validIndex);
    }

    flatListRef.current?.scrollToOffset({
      offset: validIndex * ITEM_HEIGHT,
      animated: true,
    });
  }, [data.length, selectedIndex, onSelect, findNearestEnabled]);

  const paddingItems = Math.floor(VISIBLE_ITEMS / 2);

  const renderItem = useCallback(({ item, index }: { item: number; index: number }) => {
    const isSelected = index === selectedIndex;
    const isDisabled = disabledIndices.includes(index);
    const distance = Math.abs(index - selectedIndex);
    const opacity = isDisabled 
      ? 0.3 
      : distance === 0 ? 1 : distance === 1 ? 0.5 : 0.25;

    return (
      <View style={[wheelStyles.item, { width, height: ITEM_HEIGHT, opacity }]}>
        <Text
          style={[
            wheelStyles.itemText,
            isSelected && !isDisabled && wheelStyles.itemTextSelected,
            isDisabled && wheelStyles.itemTextDisabled,
          ]}
        >
          {formatItem(item)}
        </Text>
        {isDisabled && <View style={wheelStyles.strikethrough} />}
      </View>
    );
  }, [selectedIndex, formatItem, width, disabledIndices]);

  return (
    <View style={[wheelStyles.column, { width, height: PICKER_HEIGHT }]}>
      <View style={wheelStyles.selectionHighlight} />
      
      <FlatList
        ref={flatListRef}
        data={data}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{
          paddingTop: paddingItems * ITEM_HEIGHT,
          paddingBottom: paddingItems * ITEM_HEIGHT,
        }}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        style={{ zIndex: 2 }}
      />
    </View>
  );
};

const wheelStyles = StyleSheet.create({
  column: {
    overflow: 'hidden',
    position: 'relative',
  },
  selectionHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    backgroundColor: PURPLE_LIGHT,
    borderRadius: 12,
    zIndex: 0,
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  itemText: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: TEXT_MUTED,
  },
  itemTextSelected: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: PURPLE,
  },
  itemTextDisabled: {
    color: TEXT_DISABLED,
    fontFamily: 'Inter-Medium',
  },
  strikethrough: {
    position: 'absolute',
    left: '20%',
    right: '20%',
    height: 1.5,
    backgroundColor: TEXT_DISABLED,
    top: '50%',
  },
});

// Main Component
interface CustomDateTimePickerProps {
  isVisible: boolean;
  mode: 'date' | 'time';
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  minimumDate?: Date;
}

export default function CustomDateTimePicker({
  isVisible,
  mode,
  value,
  onConfirm,
  onCancel,
  minimumDate,
}: CustomDateTimePickerProps) {
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideAnim = useRef(new RNAnimated.Value(300)).current;

  const [selectedDay, setSelectedDay] = useState(value.getDate() - 1);
  const [selectedMonth, setSelectedMonth] = useState(value.getMonth());
  const [selectedYear, setSelectedYear] = useState(0);
  const [selectedHour, setSelectedHour] = useState(value.getHours());
  const [selectedMinute, setSelectedMinute] = useState(
    Math.floor(value.getMinutes() / 5)
  );

  const years = generateYears();
  const days = generateDays(selectedMonth, years[selectedYear] || new Date().getFullYear());
  const hours = generateHours();
  const minutes = generateMinutes();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Calculate disabled indices for DATE mode
  const getDisabledDayIndices = (): number[] => {
    const yr = years[selectedYear];
    if (yr > currentYear || selectedMonth > currentMonth && yr === currentYear) return [];
    if (yr < currentYear || selectedMonth < currentMonth) return days.map((_, i) => i);
    // Same month & year: disable days before today
    return days.reduce<number[]>((acc, day, i) => {
      if (day < currentDay) acc.push(i);
      return acc;
    }, []);
  };

  const getDisabledMonthIndices = (): number[] => {
    const yr = years[selectedYear];
    if (yr > currentYear) return [];
    // Same year: disable months before current month
    return Array.from({ length: 12 }, (_, i) => i).reduce<number[]>((acc, m, i) => {
      if (m < currentMonth) acc.push(i);
      return acc;
    }, []);
  };

  const getDisabledYearIndices = (): number[] => {
    return years.reduce<number[]>((acc, y, i) => {
      if (y < currentYear) acc.push(i);
      return acc;
    }, []);
  };

  // Calculate disabled indices for TIME mode
  const getDisabledHourIndices = (): number[] => {
    // Check if selected date is today
    const selectedDateObj = value;
    const isToday = selectedDateObj.getFullYear() === currentYear
      && selectedDateObj.getMonth() === currentMonth
      && selectedDateObj.getDate() === currentDay;
    if (!isToday) return [];
    return hours.reduce<number[]>((acc, h, i) => {
      if (h < currentHour) acc.push(i);
      return acc;
    }, []);
  };

  const getDisabledMinuteIndices = (): number[] => {
    const selectedDateObj = value;
    const isToday = selectedDateObj.getFullYear() === currentYear
      && selectedDateObj.getMonth() === currentMonth
      && selectedDateObj.getDate() === currentDay;
    if (!isToday) return [];
    if (hours[selectedHour] > currentHour) return [];
    if (hours[selectedHour] < currentHour) return minutes.map((_, i) => i);
    // Same hour: disable minutes that have passed
    return minutes.reduce<number[]>((acc, m, i) => {
      if (m <= currentMinute) acc.push(i);
      return acc;
    }, []);
  };

  useEffect(() => {
    if (isVisible) {
      const now = new Date();
      
      // Date: use value or current date
      setSelectedDay(value.getDate() - 1);
      setSelectedMonth(value.getMonth());
      const yearIdx = years.indexOf(value.getFullYear());
      setSelectedYear(yearIdx >= 0 ? yearIdx : 0);
      
      // Time: always use current time as default
      if (mode === 'time') {
        setSelectedHour(now.getHours());
        // Round up to next 5-minute slot
        const nextMinute = Math.ceil(now.getMinutes() / 5);
        setSelectedMinute(nextMinute >= 12 ? 11 : nextMinute);
      } else {
        setSelectedHour(value.getHours());
        setSelectedMinute(Math.floor(value.getMinutes() / 5));
      }

      RNAnimated.parallel([
        RNAnimated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        RNAnimated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      RNAnimated.parallel([
        RNAnimated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        RNAnimated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const handleConfirm = () => {
    const newDate = new Date(value);
    if (mode === 'date') {
      newDate.setFullYear(years[selectedYear]);
      newDate.setMonth(selectedMonth);
      newDate.setDate(days[selectedDay] || 1);
    } else {
      newDate.setHours(hours[selectedHour]);
      newDate.setMinutes(minutes[selectedMinute]);
    }
    onConfirm(newDate);
  };

  if (!isVisible) return null;

  return (
    <Modal transparent visible={isVisible} animationType="none">
      <RNAnimated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.overlayTouch} onPress={onCancel} activeOpacity={1} />
        
        <RNAnimated.View
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconBox}>
              {mode === 'date' ? (
                <Calendar size={17} color="#FFFFFF" />
              ) : (
                <Clock size={17} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.headerTitle}>
              {mode === 'date' ? 'Pilih Tanggal' : 'Pilih Waktu'}
            </Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
              <X size={20} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={styles.previewBox}>
            {mode === 'date' ? (
              <Text style={styles.previewText}>
                {days[selectedDay] || 1} {MONTHS[selectedMonth]} {years[selectedYear]}
              </Text>
            ) : (
              <Text style={styles.previewText}>
                {String(hours[selectedHour]).padStart(2, '0')}
                <Text style={styles.previewColon}>:</Text>
                {String(minutes[selectedMinute]).padStart(2, '0')}
              </Text>
            )}
          </View>

          {/* Wheels */}
          <View style={styles.wheelsContainer}>
            {mode === 'date' ? (
              <>
                <WheelColumn
                  data={days}
                  selectedIndex={selectedDay}
                  onSelect={setSelectedDay}
                  formatItem={(item) => String(item)}
                  width={60}
                  disabledIndices={getDisabledDayIndices()}
                />
                <WheelColumn
                  data={Array.from({ length: 12 }, (_, i) => i)}
                  selectedIndex={selectedMonth}
                  onSelect={setSelectedMonth}
                  formatItem={(item) => MONTHS[item]?.substring(0, 3) || ''}
                  width={90}
                  disabledIndices={getDisabledMonthIndices()}
                />
                <WheelColumn
                  data={years}
                  selectedIndex={selectedYear}
                  onSelect={setSelectedYear}
                  formatItem={(item) => String(item)}
                  width={80}
                  disabledIndices={getDisabledYearIndices()}
                />
              </>
            ) : (
              <>
                <WheelColumn
                  data={hours}
                  selectedIndex={selectedHour}
                  onSelect={setSelectedHour}
                  formatItem={(item) => String(item).padStart(2, '0')}
                  width={80}
                  disabledIndices={getDisabledHourIndices()}
                />
                <View style={styles.colonSeparator}>
                  <Text style={styles.colonText}>:</Text>
                </View>
                <WheelColumn
                  data={minutes}
                  selectedIndex={selectedMinute}
                  onSelect={setSelectedMinute}
                  formatItem={(item) => String(item).padStart(2, '0')}
                  width={80}
                  disabledIndices={getDisabledMinuteIndices()}
                />
              </>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Konfirmasi</Text>
            </TouchableOpacity>
          </View>
        </RNAnimated.View>
      </RNAnimated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouch: {
    flex: 1,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
  },
  headerIconBox: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBox: {
    backgroundColor: PURPLE_LIGHT,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  previewText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: PURPLE,
    letterSpacing: 1,
  },
  previewColon: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: PURPLE,
  },
  wheelsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  colonSeparator: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    height: PICKER_HEIGHT,
  },
  colonText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: PURPLE,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: TEXT_MUTED,
  },
  confirmBtn: {
    flex: 2,
    height: 54,
    borderRadius: 18,
    backgroundColor: PURPLE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  confirmBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});
