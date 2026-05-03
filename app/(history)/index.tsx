import { FlatList, View, Text, PlatformColor } from "react-native";
import { mockRides } from "@/utils/mock-data";
import { RideItem } from "@/components/ride-item";

export default function HistoryScreen() {
  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={mockRides}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingVertical: 8 }}
      ItemSeparatorComponent={() => (
        <View
          style={{
            height: 0.5,
            backgroundColor: PlatformColor("separator") as unknown as string,
            marginLeft: 68,
          }}
        />
      )}
      ListEmptyComponent={() => (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 48 }}>
          <Text style={{ color: PlatformColor("secondaryLabel") as unknown as string, fontSize: 15 }}>
            No rides found
          </Text>
        </View>
      )}
      renderItem={({ item, index }) => <RideItem ride={item} index={index} />}
    />
  );
}
