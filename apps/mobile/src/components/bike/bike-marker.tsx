import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import { colors, radii, shadows, sizes } from "@/theme/tokens";

interface BikeMarkerProps {
	readonly selected?: boolean;
	readonly maintenance?: boolean;
	readonly reserved?: boolean;
	readonly onPress: () => void;
}

export function BikeMarker({
	selected = false,
	maintenance = false,
	reserved = false,
	onPress,
}: BikeMarkerProps) {
	const backgroundColor = selected
		? colors.markerSelected
		: reserved
			? colors.markerReserved
			: maintenance
				? colors.markerMaintenance
				: colors.markerAvailable;

	const size = selected ? sizes.markerSelected : sizes.marker;

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel="Bike marker"
			accessibilityState={{
				selected,
				disabled: reserved,
			}}
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
				...shadows.soft,
			}}
		>
			<View
				style={{
					width: selected ? 20 : 18,
					height: selected ? 20 : 18,
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<MaterialCommunityIcons
					name="bike"
					size={selected ? 18 : 16}
					color={colors.surface}
				/>
			</View>
		</Pressable>
	);
}
