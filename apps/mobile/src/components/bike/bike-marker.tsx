import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import { colors, radii, sizes, shadows } from "@/theme/tokens";

interface BikeMarkerProps {
  readonly selected?: boolean;
  readonly lowBattery?: boolean;
  readonly reserved?: boolean;
  readonly onPress: () => void;
}

export function BikeMarker({
  selected = false,
  lowBattery = false,
  reserved = false,
  onPress
}: BikeMarkerProps) {
  const backgroundColor = selected
    ? colors.markerSelected
    : reserved
      ? colors.markerReserved
      : lowBattery
        ? colors.markerLowBattery
        : colors.markerAvailable;

  const size = selected ? sizes.markerSelected : sizes.marker;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: radii.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor,
        borderWidth: 2,
        borderColor: colors.surface,
        ...shadows.soft
      }}>
      <View
        style={{
          width: selected ? 20 : 18,
          height: selected ? 20 : 18,
          alignItems: "center",
          justifyContent: "center"
        }}>
        <MaterialCommunityIcons name="bike" size={selected ? 18 : 16} color={colors.surface} />
      </View>
    </Pressable>
  );
}
