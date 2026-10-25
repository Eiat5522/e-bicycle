import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("typegen", Path(__file__).resolve().parents[1] / "generate-native-database-types.py")
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Cannot load native type generator")
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)


# Sanitized snapshots of real native40/native41 harness output. No scratch paths,
# credentials, actor IDs or dependency on external fixture files.
REAL_MANIFESTS = [{'database': 'sanitized_native',
  'migration_count': 40,
  'preserved_foundation_count': 38,
  'public_gate': 'closed',
  'hashes': {'20260411093000_create_profiles.sql': 'caf15269fd1b1297f479855fbd520aaec91146ecd88e1e3ea41d36787dcdb935',
             '20260411104903_create_wallets.sql': 'cd64d7e24701612d944fd7b64b9e2a34b54a09ef772048ae49608753d67d3890',
             '20260411170000_create_bikes.sql': 'ca20fb318f2cbf31c4901690a0ec499a193db499afeb70e6e51da1bb9c5e69a0',
             '20260413123912_add_admin_roles_to_profiles.sql': '785c49773b09e9669b929b75aa4c788615729e5433246a62362febaf5949584b',
             '20260413132053_allow_admin_wallet_reads.sql': '503712ac7e0510ccbf21efebf3eef90cdc14f7501a91f6a83f1f3ed6074dec6e',
             '20260413133749_add_bicycle_admin_management_v2.sql': '480311205591a2123da1acf0bd6bb435881154a6be2cf4c463444d7389a4651f',
             '20260414111741_add_profile_link_to_bike_ride_history.sql': '352b7b7d39922d71e4b3aa8f4cbb5bfde0b987b7e51f8c1d59877e7a3a2832ad',
             '20260414112254_remove_public_bike_image_listing_policy.sql': '98d65f70078198787d711d77c95a4283e94699b5050bb2590283382f0aa173d4',
             '20260414121613_restore_admin_profile_and_wallet_policies.sql': '9e200e43890505a1e7a9991e86525dc01657f0efd71380306628ee6d5cce7f54',
             '20260414191548_restore_admin_profile_and_wallet_policies.sql': '9e9fd16e187b72764ec56b34d97781d554efbc61265a4982cd51caf664c40391',
             '20260420121141_add_active_rider_id_to_bikes.sql': 'd00af2b9e5eb2865ebea5cb30d61c28c6e59b3b1eb23fe0999e12533687aad81',
             '20260421080801_add_ride_revenue_calculation.sql': '87f1b4190d616167e121288fc3e70f5876821b22f18eab0badb784721bc17887',
             '20260421083232_add_ride_revenue_calculation.sql': 'c2de9a8d811e3d6aef2f8465fe16b0e8527c8e3bf2f52f8910eb0477dd3d4785',
             '20260421180718_align_pricing_labels_to_thb.sql': 'a6bb7262db0d7e0495d55c3544cbf562540740b384cd244346ecb749d8c517a1',
             '20260422013000_add_reward_milestones.sql': 'dd958c04c9bf8068520d4746573a7eedaab931e466bfea7ec1d60b567bb263cc',
             '20260703000000_add_bike_status_events.sql': 'd648df84ae1aaecfbcb1bf4b9979dff3b1c0273ee5f167fdc8c534de48bd5b7e',
             '20260703010000_add_rental_transactions.sql': 'b4b245aa8cf5b527d878ccf936eaf47d11c252052d4b5fd18f979e5da2f61c1f',
             '20260710091611_add_mvp_operational_schema.sql': '796a3cd33d87aa153de051273d67b24151aebbe63a30491c3817f739908d6448',
             '20260714000000_atomic_bike_status_update.sql': '47c09e1cd2b2828b35a33deb609228d831166d0824d3c5932ca742dab83320d1',
             '20260714120000_add_phase_d_reporting_infrastructure.sql': '360f7a53c8f0f0ea8123a5f552f20a7cacf5e7a95b6eea7423eaac666f87b738',
             '20260714130000_add_operational_events.sql': '81917ef6cc16aab7c5e4546882b0e838569193005e1343cf4d5ef783690c445f',
             '20260714140000_add_sustainability_reporting.sql': '5768bd677ba08ebd0f0219d2728cf1a75bfc3cfce751881933ef04c6b8fe9efb',
             '20260714150000_add_user_engagement_aggregates.sql': 'fddbb5a7dbf5b0d1e6600df2ac9ed8bc3df0148fc3f409d2a0940b96280c26e4',
             '20260714160000_add_workflow_functions.sql': 'c9cd14e2a3088e358ff807ce9d894919f52f77fc26474ad57cdd14333c2588e6',
             '20260714170000_make_bike_status_rpc_params_nullable.sql': '7c6880163841b49a4814e636e2e9bee201616b13e4710f761bc73b2054f9a418',
             '20260714200000_workflow_functions_servicerole.sql': '927943c34fcdde77c22e9f8d01e0536a7623ed89425fc4842924b5a7bf910923',
             '20260715050000_fix_geofence_and_report_regeneration.sql': '9c008773f130157d0b415dc93c4f6a6a4d8d696c6272c682ff0b08527d3a6f32',
             '20260722000000_secure_bike_status_rpc.sql': 'e2f525c7360ac393abc47e2a8cb8fd2144eab8db00b25a4f3a999787d2edc262',
             '20260722000001_shared_ride_wallet_transactions.sql': '6fe0e4ad6b0502b4cc1e4ac5eeb32ed65666778654edbe112c07aa9f39b9e427',
             '20260722083000_add_ride_sharing_schema.sql': '60595e753909bebaca4b9b8691946f62b0af9b684c0174ef3133483250eba991',
             '20260727000000_expand_bike_status_model.sql': 'b6ce4aae816b92698a9814913417f2a6452e1597a54722d5e673b7ec0ea048a5',
             '20260727210000_add_tablet_sync_schema.sql': 'b6e01d0ec1ba5dbce8aaaaf6e136ce9bd27ec1d94bb0844fc002088151355517',
             '20260728000000_remediate_tablet_sync_constraints.sql': '1942ea99aca4b1085de5c2057960baf12a283ae73c9d0caf4ab1e1b92083e6b9',
             '20260728120000_enforce_bike_status_rpc_policy.sql': 'cbc03b86f99e3dcd222ac9f005fc369b0832ec3123cb1eea4455782bd033f154',
             '20260728130000_harden_tablet_sync_rls.sql': '1add7ff23d0f8c3244d4307756c96a0ec607ccf09b01cc4bd4afaf9550b777fa',
             '20260728140000_fix_complete_ride_canonical_return.sql': 'ec29d41a2c9d137fca969148ee6b004a152786ca0a72063a0cd99008cd0bcca5',
             '20260728150000_add_ride_completion_receipts.sql': '49db5cfa0713207b7b65ab9d3782cd92bc80f9d797e7a16ee6b31a3ac916d8f8',
             '20260728160000_add_station_assisted_rental_identity.sql': 'b3f9814eec78f96d67707746aad6565bd32ca850e7b6f39a4ee81f177889280a',
             '20260728170000_add_private_station_start_processors.sql': 'e8a75a8e134c2d60c1326c5fdf4b893bbe0c5ea5126d9aeb67d16da72fe6b1c3',
             '20260728180000_add_private_station_return_processor.sql': 'fc06779a18402fa1da0310732f2be82541fc2d7b57ecde4055d3dd35ac3bc4c7'},
  'input_freeze': {'sources': {'supabase/migrations/20260411093000_create_profiles.sql': 'caf15269fd1b1297f479855fbd520aaec91146ecd88e1e3ea41d36787dcdb935',
                               'supabase/migrations/20260411104903_create_wallets.sql': 'cd64d7e24701612d944fd7b64b9e2a34b54a09ef772048ae49608753d67d3890',
                               'supabase/migrations/20260411170000_create_bikes.sql': 'ca20fb318f2cbf31c4901690a0ec499a193db499afeb70e6e51da1bb9c5e69a0',
                               'supabase/migrations/20260413123912_add_admin_roles_to_profiles.sql': '785c49773b09e9669b929b75aa4c788615729e5433246a62362febaf5949584b',
                               'supabase/migrations/20260413132053_allow_admin_wallet_reads.sql': '503712ac7e0510ccbf21efebf3eef90cdc14f7501a91f6a83f1f3ed6074dec6e',
                               'supabase/migrations/20260413133749_add_bicycle_admin_management_v2.sql': '480311205591a2123da1acf0bd6bb435881154a6be2cf4c463444d7389a4651f',
                               'supabase/migrations/20260414111741_add_profile_link_to_bike_ride_history.sql': '352b7b7d39922d71e4b3aa8f4cbb5bfde0b987b7e51f8c1d59877e7a3a2832ad',
                               'supabase/migrations/20260414112254_remove_public_bike_image_listing_policy.sql': '98d65f70078198787d711d77c95a4283e94699b5050bb2590283382f0aa173d4',
                               'supabase/migrations/20260414121613_restore_admin_profile_and_wallet_policies.sql': '9e200e43890505a1e7a9991e86525dc01657f0efd71380306628ee6d5cce7f54',
                               'supabase/migrations/20260414191548_restore_admin_profile_and_wallet_policies.sql': '9e9fd16e187b72764ec56b34d97781d554efbc61265a4982cd51caf664c40391',
                               'supabase/migrations/20260420121141_add_active_rider_id_to_bikes.sql': 'd00af2b9e5eb2865ebea5cb30d61c28c6e59b3b1eb23fe0999e12533687aad81',
                               'supabase/migrations/20260421080801_add_ride_revenue_calculation.sql': '87f1b4190d616167e121288fc3e70f5876821b22f18eab0badb784721bc17887',
                               'supabase/migrations/20260421083232_add_ride_revenue_calculation.sql': 'c2de9a8d811e3d6aef2f8465fe16b0e8527c8e3bf2f52f8910eb0477dd3d4785',
                               'supabase/migrations/20260421180718_align_pricing_labels_to_thb.sql': 'a6bb7262db0d7e0495d55c3544cbf562540740b384cd244346ecb749d8c517a1',
                               'supabase/migrations/20260422013000_add_reward_milestones.sql': 'dd958c04c9bf8068520d4746573a7eedaab931e466bfea7ec1d60b567bb263cc',
                               'supabase/migrations/20260703000000_add_bike_status_events.sql': 'd648df84ae1aaecfbcb1bf4b9979dff3b1c0273ee5f167fdc8c534de48bd5b7e',
                               'supabase/migrations/20260703010000_add_rental_transactions.sql': 'b4b245aa8cf5b527d878ccf936eaf47d11c252052d4b5fd18f979e5da2f61c1f',
                               'supabase/migrations/20260710091611_add_mvp_operational_schema.sql': '796a3cd33d87aa153de051273d67b24151aebbe63a30491c3817f739908d6448',
                               'supabase/migrations/20260714000000_atomic_bike_status_update.sql': '47c09e1cd2b2828b35a33deb609228d831166d0824d3c5932ca742dab83320d1',
                               'supabase/migrations/20260714120000_add_phase_d_reporting_infrastructure.sql': '360f7a53c8f0f0ea8123a5f552f20a7cacf5e7a95b6eea7423eaac666f87b738',
                               'supabase/migrations/20260714130000_add_operational_events.sql': '81917ef6cc16aab7c5e4546882b0e838569193005e1343cf4d5ef783690c445f',
                               'supabase/migrations/20260714140000_add_sustainability_reporting.sql': '5768bd677ba08ebd0f0219d2728cf1a75bfc3cfce751881933ef04c6b8fe9efb',
                               'supabase/migrations/20260714150000_add_user_engagement_aggregates.sql': 'fddbb5a7dbf5b0d1e6600df2ac9ed8bc3df0148fc3f409d2a0940b96280c26e4',
                               'supabase/migrations/20260714160000_add_workflow_functions.sql': 'c9cd14e2a3088e358ff807ce9d894919f52f77fc26474ad57cdd14333c2588e6',
                               'supabase/migrations/20260714170000_make_bike_status_rpc_params_nullable.sql': '7c6880163841b49a4814e636e2e9bee201616b13e4710f761bc73b2054f9a418',
                               'supabase/migrations/20260714200000_workflow_functions_servicerole.sql': '927943c34fcdde77c22e9f8d01e0536a7623ed89425fc4842924b5a7bf910923',
                               'supabase/migrations/20260715050000_fix_geofence_and_report_regeneration.sql': '9c008773f130157d0b415dc93c4f6a6a4d8d696c6272c682ff0b08527d3a6f32',
                               'supabase/migrations/20260722000000_secure_bike_status_rpc.sql': 'e2f525c7360ac393abc47e2a8cb8fd2144eab8db00b25a4f3a999787d2edc262',
                               'supabase/migrations/20260722000001_shared_ride_wallet_transactions.sql': '6fe0e4ad6b0502b4cc1e4ac5eeb32ed65666778654edbe112c07aa9f39b9e427',
                               'supabase/migrations/20260722083000_add_ride_sharing_schema.sql': '60595e753909bebaca4b9b8691946f62b0af9b684c0174ef3133483250eba991',
                               'supabase/migrations/20260727000000_expand_bike_status_model.sql': 'b6ce4aae816b92698a9814913417f2a6452e1597a54722d5e673b7ec0ea048a5',
                               'supabase/migrations/20260727210000_add_tablet_sync_schema.sql': 'b6e01d0ec1ba5dbce8aaaaf6e136ce9bd27ec1d94bb0844fc002088151355517',
                               'supabase/migrations/20260728000000_remediate_tablet_sync_constraints.sql': '1942ea99aca4b1085de5c2057960baf12a283ae73c9d0caf4ab1e1b92083e6b9',
                               'supabase/migrations/20260728120000_enforce_bike_status_rpc_policy.sql': 'cbc03b86f99e3dcd222ac9f005fc369b0832ec3123cb1eea4455782bd033f154',
                               'supabase/migrations/20260728130000_harden_tablet_sync_rls.sql': '1add7ff23d0f8c3244d4307756c96a0ec607ccf09b01cc4bd4afaf9550b777fa',
                               'supabase/migrations/20260728140000_fix_complete_ride_canonical_return.sql': 'ec29d41a2c9d137fca969148ee6b004a152786ca0a72063a0cd99008cd0bcca5',
                               'supabase/migrations/20260728150000_add_ride_completion_receipts.sql': '49db5cfa0713207b7b65ab9d3782cd92bc80f9d797e7a16ee6b31a3ac916d8f8',
                               'supabase/migrations/20260728160000_add_station_assisted_rental_identity.sql': 'b3f9814eec78f96d67707746aad6565bd32ca850e7b6f39a4ee81f177889280a',
                               'supabase/migrations/20260728170000_add_private_station_start_processors.sql': 'e8a75a8e134c2d60c1326c5fdf4b893bbe0c5ea5126d9aeb67d16da72fe6b1c3',
                               'supabase/migrations/20260728180000_add_private_station_return_processor.sql': 'fc06779a18402fa1da0310732f2be82541fc2d7b57ecde4055d3dd35ac3bc4c7',
                               'supabase/tests/native_input_freeze.py': '8f798d7859c21276b5c8430d27c4aefcbf706ed75872139d4a840c267d515a6f',
                               'supabase/tests/st02_bike_status_enum_migration.sql': '441b1a60d5d9f9e4a4eb8b9848ebbec686497ffab8b5b9bb336f4573c67c604c',
                               'supabase/tests/st02_bike_status_enum_unknown_value.sql': '35185d217e96422553c19d7c687df7ecc3997f46512f1d37c5784dd6b5bff44c',
                               'supabase/tests/st02_bike_status_rpc_policy.sql': '0efe2b7178c52c3aa82cabed64a49aca2eb344d67f61e45dd7b1a5c5c49edf03',
                               'supabase/tests/st02_complete_ride_canonical_status.sql': 'b73d2234fb336bd438b1cbf30a10f08919c75f431e890500d9cbeca3f69756f3',
                               'supabase/tests/st02_complete_ride_recovery.sql': 'a2196f1df13b9aa466e150811eed8e0ec54ef470c7dd2f74da932abeae5222ac',
                               'supabase/tests/st02_complete_ride_recovery_concurrency.py': 'a645c1c2336982fdbadd8f44df74ff41f66f7c0adb50a18ddce69e3c1fc0d577',
                               'supabase/tests/st02_station_foundation_denials.sql': 'f2cb692bf67694ec886d9c3c2212612497a49ae33941d4488f3ec99642cebb6f',
                               'supabase/tests/st02_station_private_acl.sql': 'fc08d70b684ca26f330cfbffdddba6a1e3b18d39a96980979b03805b522000be',
                               'supabase/tests/st02_station_rental_identity.sql': 'adf5fe0258442f68e7f5b9ade514cf7d60df7f4dacef571aa171fc8a900bd5cc',
                               'supabase/tests/st02_station_rental_identity_native.py': '67dd0c3cd17a60b410e0c0c6b870509c8b6b8602a30e1f8cd45839ff91aeb832',
                               'supabase/tests/st02_station_return.sql': 'ed4cf5d3cd91a0548a5e99376862552d65dabe8a3dd2dd6c17cab1510e992e91',
                               'supabase/tests/st02_station_return_cases.sql': '08ae04cec34a0b2b734f4594a7d4c4ecb5d457e750569278c1c0584d5ce2d815',
                               'supabase/tests/st02_station_return_concurrency.py': 'af92bd9a0bdb07cd1ceae1b2d338d97befd4397de062ef9df6469c693fb0abae',
                               'supabase/tests/st02_station_return_mutations.py': '11c67548af3dce7f5bfd9922a208c294b7096c07588c38008a45eac5119a0cf2',
                               'supabase/tests/st02_station_start.sql': '7f58f4957a30ac4d9a8902c7dc7857949b4adbaadfea897595dff4455abcf267',
                               'supabase/tests/st02_station_start_concurrency.py': '35ad54edf2e2fb4908f034f86e408b488311f883dec6600b38876a6c219e323f',
                               'supabase/tests/st02_station_start_native.py': '758d584e92c0cfe5a6b28885c49a1c9edf403544eb69f37ffb3efd50adea09ee',
                               'supabase/tests/st02_tablet_sync_constraints.sql': '0050883036d57b86a41af5f95ead32bc1eaf156128eff9fc99a7dc474959e033',
                               'supabase/tests/st02_tablet_sync_constraints_preflight.sql': 'ac33cc6124f237067fd36ea2c1d0573d9f51fc6f584037ac6b560af5a8c5e80b',
                               'supabase/tests/st02_tablet_sync_rls.sql': '63fc951eed3c46a13d71299afa6e37e7f80dfb2c72e6fd3d3575485bb4826d45',
                               'supabase/tests/support/foundation_hashes.json': '3d37334bc4d3f0aeebbdc409ca8c8f14087e5c37a48f9a0ed9701e0ee911dfe7',
                               'supabase/tests/support/native_bootstrap.sql': 'fc400c8542cd3580da0ad7bc799505306cd052e61d0c1acd2c17e22e6b792ba7',
                               'supabase/tests/test_native_input_freeze.py': '70f634782c0c8194ec033ce827f50c6fb6d5628f3385a635f639af14dd799b6d'},
                   'external': {},
                   'effective_environment': {'LANG': 'C'},
                   'effective_pg_config': {},
                   'effective_bootstrap_sha256': 'fc400c8542cd3580da0ad7bc799505306cd052e61d0c1acd2c17e22e6b792ba7'},
  'post_freeze_verified': True,
  'results': [{'case': 'create', 'exit': 0},
              {'case': 'bootstrap', 'exit': 0},
              {'case': '20260411093000_create_profiles.sql', 'exit': 0},
              {'case': '20260411104903_create_wallets.sql', 'exit': 0},
              {'case': '20260411170000_create_bikes.sql', 'exit': 0},
              {'case': '20260413123912_add_admin_roles_to_profiles.sql', 'exit': 0},
              {'case': '20260413132053_allow_admin_wallet_reads.sql', 'exit': 0},
              {'case': '20260413133749_add_bicycle_admin_management_v2.sql', 'exit': 0},
              {'case': '20260414111741_add_profile_link_to_bike_ride_history.sql', 'exit': 0},
              {'case': '20260414112254_remove_public_bike_image_listing_policy.sql', 'exit': 0},
              {'case': '20260414121613_restore_admin_profile_and_wallet_policies.sql', 'exit': 0},
              {'case': '20260414191548_restore_admin_profile_and_wallet_policies.sql', 'exit': 0},
              {'case': '20260420121141_add_active_rider_id_to_bikes.sql', 'exit': 0},
              {'case': '20260421080801_add_ride_revenue_calculation.sql', 'exit': 0},
              {'case': '20260421083232_add_ride_revenue_calculation.sql', 'exit': 0},
              {'case': '20260421180718_align_pricing_labels_to_thb.sql', 'exit': 0},
              {'case': '20260422013000_add_reward_milestones.sql', 'exit': 0},
              {'case': '20260703000000_add_bike_status_events.sql', 'exit': 0},
              {'case': '20260703010000_add_rental_transactions.sql', 'exit': 0},
              {'case': '20260710091611_add_mvp_operational_schema.sql', 'exit': 0},
              {'case': '20260714000000_atomic_bike_status_update.sql', 'exit': 0},
              {'case': '20260714120000_add_phase_d_reporting_infrastructure.sql', 'exit': 0},
              {'case': '20260714130000_add_operational_events.sql', 'exit': 0},
              {'case': '20260714140000_add_sustainability_reporting.sql', 'exit': 0},
              {'case': '20260714150000_add_user_engagement_aggregates.sql', 'exit': 0},
              {'case': '20260714160000_add_workflow_functions.sql', 'exit': 0},
              {'case': '20260714170000_make_bike_status_rpc_params_nullable.sql', 'exit': 0},
              {'case': '20260714200000_workflow_functions_servicerole.sql', 'exit': 0},
              {'case': '20260715050000_fix_geofence_and_report_regeneration.sql', 'exit': 0},
              {'case': '20260722000000_secure_bike_status_rpc.sql', 'exit': 0},
              {'case': '20260722000001_shared_ride_wallet_transactions.sql', 'exit': 0},
              {'case': '20260722083000_add_ride_sharing_schema.sql', 'exit': 0},
              {'case': '20260727000000_expand_bike_status_model.sql', 'exit': 0},
              {'case': '20260727210000_add_tablet_sync_schema.sql', 'exit': 0},
              {'case': '20260728000000_remediate_tablet_sync_constraints.sql', 'exit': 0},
              {'case': '20260728120000_enforce_bike_status_rpc_policy.sql', 'exit': 0},
              {'case': '20260728130000_harden_tablet_sync_rls.sql', 'exit': 0},
              {'case': '20260728140000_fix_complete_ride_canonical_return.sql', 'exit': 0},
              {'case': '20260728150000_add_ride_completion_receipts.sql', 'exit': 0},
              {'case': '20260728160000_add_station_assisted_rental_identity.sql', 'exit': 0},
              {'case': '20260728170000_add_private_station_start_processors.sql', 'exit': 0},
              {'case': '20260728180000_add_private_station_return_processor.sql', 'exit': 0},
              {'case': 'initial-st02_station_private_acl.sql', 'exit': 0},
              {'case': 'initial-st02_station_foundation_denials.sql', 'exit': 0},
              {'case': 'initial-st02_station_start.sql', 'exit': 0},
              {'case': 'initial-st02_station_rental_identity.sql', 'exit': 0},
              {'case': 'initial-st02_complete_ride_canonical_status.sql', 'exit': 0},
              {'case': 'initial-st02_complete_ride_recovery.sql', 'exit': 0},
              {'case': 'initial-return', 'exit': 0},
              {'case': 'replay-migration', 'exit': 0},
              {'case': 'replay-st02_station_private_acl.sql', 'exit': 0},
              {'case': 'replay-st02_station_foundation_denials.sql', 'exit': 0},
              {'case': 'replay-st02_station_start.sql', 'exit': 0},
              {'case': 'replay-st02_station_rental_identity.sql', 'exit': 0},
              {'case': 'replay-st02_complete_ride_canonical_status.sql', 'exit': 0},
              {'case': 'replay-st02_complete_ride_recovery.sql', 'exit': 0},
              {'case': 'replay-return', 'exit': 0},
              {'case': 'mutation-manual-override', 'exit': 0},
              {'case': 'mutation-stale-canonical-bike', 'exit': 0},
              {'case': 'mutation-failed-inspection-notes', 'exit': 0},
              {'case': 'mutation-old-return-newer-active', 'exit': 0},
              {'case': 'mutation-maintenance-event-rollback', 'exit': 0},
              {'case': 'mutation-maintenance-audit-rollback', 'exit': 0},
              {'case': 'mutation-audit-block-rollback', 'exit': 0},
              {'case': 'station-first', 'exit': 0},
              {'case': 'mobile-first', 'exit': 0},
              {'case': 'duplicate-start', 'exit': 0},
              {'case': 'return-first', 'exit': 0},
              {'case': 'start-first', 'exit': 0},
              {'case': 'duplicate-return', 'exit': 0},
              {'case': 'recovery-concurrency', 'exit': 0}],
  'step_count': 71},
 {'database': 'sanitized_native',
  'migration_count': 41,
  'preserved_foundation_count': 38,
  'public_gate': 'closed',
  'hashes': {'20260411093000_create_profiles.sql': 'caf15269fd1b1297f479855fbd520aaec91146ecd88e1e3ea41d36787dcdb935',
             '20260411104903_create_wallets.sql': 'cd64d7e24701612d944fd7b64b9e2a34b54a09ef772048ae49608753d67d3890',
             '20260411170000_create_bikes.sql': 'ca20fb318f2cbf31c4901690a0ec499a193db499afeb70e6e51da1bb9c5e69a0',
             '20260413123912_add_admin_roles_to_profiles.sql': '785c49773b09e9669b929b75aa4c788615729e5433246a62362febaf5949584b',
             '20260413132053_allow_admin_wallet_reads.sql': '503712ac7e0510ccbf21efebf3eef90cdc14f7501a91f6a83f1f3ed6074dec6e',
             '20260413133749_add_bicycle_admin_management_v2.sql': '480311205591a2123da1acf0bd6bb435881154a6be2cf4c463444d7389a4651f',
             '20260414111741_add_profile_link_to_bike_ride_history.sql': '352b7b7d39922d71e4b3aa8f4cbb5bfde0b987b7e51f8c1d59877e7a3a2832ad',
             '20260414112254_remove_public_bike_image_listing_policy.sql': '98d65f70078198787d711d77c95a4283e94699b5050bb2590283382f0aa173d4',
             '20260414121613_restore_admin_profile_and_wallet_policies.sql': '9e200e43890505a1e7a9991e86525dc01657f0efd71380306628ee6d5cce7f54',
             '20260414191548_restore_admin_profile_and_wallet_policies.sql': '9e9fd16e187b72764ec56b34d97781d554efbc61265a4982cd51caf664c40391',
             '20260420121141_add_active_rider_id_to_bikes.sql': 'd00af2b9e5eb2865ebea5cb30d61c28c6e59b3b1eb23fe0999e12533687aad81',
             '20260421080801_add_ride_revenue_calculation.sql': '87f1b4190d616167e121288fc3e70f5876821b22f18eab0badb784721bc17887',
             '20260421083232_add_ride_revenue_calculation.sql': 'c2de9a8d811e3d6aef2f8465fe16b0e8527c8e3bf2f52f8910eb0477dd3d4785',
             '20260421180718_align_pricing_labels_to_thb.sql': 'a6bb7262db0d7e0495d55c3544cbf562540740b384cd244346ecb749d8c517a1',
             '20260422013000_add_reward_milestones.sql': 'dd958c04c9bf8068520d4746573a7eedaab931e466bfea7ec1d60b567bb263cc',
             '20260703000000_add_bike_status_events.sql': 'd648df84ae1aaecfbcb1bf4b9979dff3b1c0273ee5f167fdc8c534de48bd5b7e',
             '20260703010000_add_rental_transactions.sql': 'b4b245aa8cf5b527d878ccf936eaf47d11c252052d4b5fd18f979e5da2f61c1f',
             '20260710091611_add_mvp_operational_schema.sql': '796a3cd33d87aa153de051273d67b24151aebbe63a30491c3817f739908d6448',
             '20260714000000_atomic_bike_status_update.sql': '47c09e1cd2b2828b35a33deb609228d831166d0824d3c5932ca742dab83320d1',
             '20260714120000_add_phase_d_reporting_infrastructure.sql': '360f7a53c8f0f0ea8123a5f552f20a7cacf5e7a95b6eea7423eaac666f87b738',
             '20260714130000_add_operational_events.sql': '81917ef6cc16aab7c5e4546882b0e838569193005e1343cf4d5ef783690c445f',
             '20260714140000_add_sustainability_reporting.sql': '5768bd677ba08ebd0f0219d2728cf1a75bfc3cfce751881933ef04c6b8fe9efb',
             '20260714150000_add_user_engagement_aggregates.sql': 'fddbb5a7dbf5b0d1e6600df2ac9ed8bc3df0148fc3f409d2a0940b96280c26e4',
             '20260714160000_add_workflow_functions.sql': 'c9cd14e2a3088e358ff807ce9d894919f52f77fc26474ad57cdd14333c2588e6',
             '20260714170000_make_bike_status_rpc_params_nullable.sql': '7c6880163841b49a4814e636e2e9bee201616b13e4710f761bc73b2054f9a418',
             '20260714200000_workflow_functions_servicerole.sql': '927943c34fcdde77c22e9f8d01e0536a7623ed89425fc4842924b5a7bf910923',
             '20260715050000_fix_geofence_and_report_regeneration.sql': '9c008773f130157d0b415dc93c4f6a6a4d8d696c6272c682ff0b08527d3a6f32',
             '20260722000000_secure_bike_status_rpc.sql': 'e2f525c7360ac393abc47e2a8cb8fd2144eab8db00b25a4f3a999787d2edc262',
             '20260722000001_shared_ride_wallet_transactions.sql': '6fe0e4ad6b0502b4cc1e4ac5eeb32ed65666778654edbe112c07aa9f39b9e427',
             '20260722083000_add_ride_sharing_schema.sql': '60595e753909bebaca4b9b8691946f62b0af9b684c0174ef3133483250eba991',
             '20260727000000_expand_bike_status_model.sql': 'b6ce4aae816b92698a9814913417f2a6452e1597a54722d5e673b7ec0ea048a5',
             '20260727210000_add_tablet_sync_schema.sql': 'b6e01d0ec1ba5dbce8aaaaf6e136ce9bd27ec1d94bb0844fc002088151355517',
             '20260728000000_remediate_tablet_sync_constraints.sql': '1942ea99aca4b1085de5c2057960baf12a283ae73c9d0caf4ab1e1b92083e6b9',
             '20260728120000_enforce_bike_status_rpc_policy.sql': 'cbc03b86f99e3dcd222ac9f005fc369b0832ec3123cb1eea4455782bd033f154',
             '20260728130000_harden_tablet_sync_rls.sql': '1add7ff23d0f8c3244d4307756c96a0ec607ccf09b01cc4bd4afaf9550b777fa',
             '20260728140000_fix_complete_ride_canonical_return.sql': 'ec29d41a2c9d137fca969148ee6b004a152786ca0a72063a0cd99008cd0bcca5',
             '20260728150000_add_ride_completion_receipts.sql': '49db5cfa0713207b7b65ab9d3782cd92bc80f9d797e7a16ee6b31a3ac916d8f8',
             '20260728160000_add_station_assisted_rental_identity.sql': 'b3f9814eec78f96d67707746aad6565bd32ca850e7b6f39a4ee81f177889280a',
             '20260728170000_add_private_station_start_processors.sql': 'e8a75a8e134c2d60c1326c5fdf4b893bbe0c5ea5126d9aeb67d16da72fe6b1c3',
             '20260728180000_add_private_station_return_processor.sql': 'fc06779a18402fa1da0310732f2be82541fc2d7b57ecde4055d3dd35ac3bc4c7',
             '20260728190000_add_private_tablet_batch_orchestrator.sql': 'd66f32d47e79fff728b63934c568f7378b53ce5b06435a2c1334db1a309b8058'},
  'input_freeze': {'sources': {'supabase/migrations/20260411093000_create_profiles.sql': 'caf15269fd1b1297f479855fbd520aaec91146ecd88e1e3ea41d36787dcdb935',
                               'supabase/migrations/20260411104903_create_wallets.sql': 'cd64d7e24701612d944fd7b64b9e2a34b54a09ef772048ae49608753d67d3890',
                               'supabase/migrations/20260411170000_create_bikes.sql': 'ca20fb318f2cbf31c4901690a0ec499a193db499afeb70e6e51da1bb9c5e69a0',
                               'supabase/migrations/20260413123912_add_admin_roles_to_profiles.sql': '785c49773b09e9669b929b75aa4c788615729e5433246a62362febaf5949584b',
                               'supabase/migrations/20260413132053_allow_admin_wallet_reads.sql': '503712ac7e0510ccbf21efebf3eef90cdc14f7501a91f6a83f1f3ed6074dec6e',
                               'supabase/migrations/20260413133749_add_bicycle_admin_management_v2.sql': '480311205591a2123da1acf0bd6bb435881154a6be2cf4c463444d7389a4651f',
                               'supabase/migrations/20260414111741_add_profile_link_to_bike_ride_history.sql': '352b7b7d39922d71e4b3aa8f4cbb5bfde0b987b7e51f8c1d59877e7a3a2832ad',
                               'supabase/migrations/20260414112254_remove_public_bike_image_listing_policy.sql': '98d65f70078198787d711d77c95a4283e94699b5050bb2590283382f0aa173d4',
                               'supabase/migrations/20260414121613_restore_admin_profile_and_wallet_policies.sql': '9e200e43890505a1e7a9991e86525dc01657f0efd71380306628ee6d5cce7f54',
                               'supabase/migrations/20260414191548_restore_admin_profile_and_wallet_policies.sql': '9e9fd16e187b72764ec56b34d97781d554efbc61265a4982cd51caf664c40391',
                               'supabase/migrations/20260420121141_add_active_rider_id_to_bikes.sql': 'd00af2b9e5eb2865ebea5cb30d61c28c6e59b3b1eb23fe0999e12533687aad81',
                               'supabase/migrations/20260421080801_add_ride_revenue_calculation.sql': '87f1b4190d616167e121288fc3e70f5876821b22f18eab0badb784721bc17887',
                               'supabase/migrations/20260421083232_add_ride_revenue_calculation.sql': 'c2de9a8d811e3d6aef2f8465fe16b0e8527c8e3bf2f52f8910eb0477dd3d4785',
                               'supabase/migrations/20260421180718_align_pricing_labels_to_thb.sql': 'a6bb7262db0d7e0495d55c3544cbf562540740b384cd244346ecb749d8c517a1',
                               'supabase/migrations/20260422013000_add_reward_milestones.sql': 'dd958c04c9bf8068520d4746573a7eedaab931e466bfea7ec1d60b567bb263cc',
                               'supabase/migrations/20260703000000_add_bike_status_events.sql': 'd648df84ae1aaecfbcb1bf4b9979dff3b1c0273ee5f167fdc8c534de48bd5b7e',
                               'supabase/migrations/20260703010000_add_rental_transactions.sql': 'b4b245aa8cf5b527d878ccf936eaf47d11c252052d4b5fd18f979e5da2f61c1f',
                               'supabase/migrations/20260710091611_add_mvp_operational_schema.sql': '796a3cd33d87aa153de051273d67b24151aebbe63a30491c3817f739908d6448',
                               'supabase/migrations/20260714000000_atomic_bike_status_update.sql': '47c09e1cd2b2828b35a33deb609228d831166d0824d3c5932ca742dab83320d1',
                               'supabase/migrations/20260714120000_add_phase_d_reporting_infrastructure.sql': '360f7a53c8f0f0ea8123a5f552f20a7cacf5e7a95b6eea7423eaac666f87b738',
                               'supabase/migrations/20260714130000_add_operational_events.sql': '81917ef6cc16aab7c5e4546882b0e838569193005e1343cf4d5ef783690c445f',
                               'supabase/migrations/20260714140000_add_sustainability_reporting.sql': '5768bd677ba08ebd0f0219d2728cf1a75bfc3cfce751881933ef04c6b8fe9efb',
                               'supabase/migrations/20260714150000_add_user_engagement_aggregates.sql': 'fddbb5a7dbf5b0d1e6600df2ac9ed8bc3df0148fc3f409d2a0940b96280c26e4',
                               'supabase/migrations/20260714160000_add_workflow_functions.sql': 'c9cd14e2a3088e358ff807ce9d894919f52f77fc26474ad57cdd14333c2588e6',
                               'supabase/migrations/20260714170000_make_bike_status_rpc_params_nullable.sql': '7c6880163841b49a4814e636e2e9bee201616b13e4710f761bc73b2054f9a418',
                               'supabase/migrations/20260714200000_workflow_functions_servicerole.sql': '927943c34fcdde77c22e9f8d01e0536a7623ed89425fc4842924b5a7bf910923',
                               'supabase/migrations/20260715050000_fix_geofence_and_report_regeneration.sql': '9c008773f130157d0b415dc93c4f6a6a4d8d696c6272c682ff0b08527d3a6f32',
                               'supabase/migrations/20260722000000_secure_bike_status_rpc.sql': 'e2f525c7360ac393abc47e2a8cb8fd2144eab8db00b25a4f3a999787d2edc262',
                               'supabase/migrations/20260722000001_shared_ride_wallet_transactions.sql': '6fe0e4ad6b0502b4cc1e4ac5eeb32ed65666778654edbe112c07aa9f39b9e427',
                               'supabase/migrations/20260722083000_add_ride_sharing_schema.sql': '60595e753909bebaca4b9b8691946f62b0af9b684c0174ef3133483250eba991',
                               'supabase/migrations/20260727000000_expand_bike_status_model.sql': 'b6ce4aae816b92698a9814913417f2a6452e1597a54722d5e673b7ec0ea048a5',
                               'supabase/migrations/20260727210000_add_tablet_sync_schema.sql': 'b6e01d0ec1ba5dbce8aaaaf6e136ce9bd27ec1d94bb0844fc002088151355517',
                               'supabase/migrations/20260728000000_remediate_tablet_sync_constraints.sql': '1942ea99aca4b1085de5c2057960baf12a283ae73c9d0caf4ab1e1b92083e6b9',
                               'supabase/migrations/20260728120000_enforce_bike_status_rpc_policy.sql': 'cbc03b86f99e3dcd222ac9f005fc369b0832ec3123cb1eea4455782bd033f154',
                               'supabase/migrations/20260728130000_harden_tablet_sync_rls.sql': '1add7ff23d0f8c3244d4307756c96a0ec607ccf09b01cc4bd4afaf9550b777fa',
                               'supabase/migrations/20260728140000_fix_complete_ride_canonical_return.sql': 'ec29d41a2c9d137fca969148ee6b004a152786ca0a72063a0cd99008cd0bcca5',
                               'supabase/migrations/20260728150000_add_ride_completion_receipts.sql': '49db5cfa0713207b7b65ab9d3782cd92bc80f9d797e7a16ee6b31a3ac916d8f8',
                               'supabase/migrations/20260728160000_add_station_assisted_rental_identity.sql': 'b3f9814eec78f96d67707746aad6565bd32ca850e7b6f39a4ee81f177889280a',
                               'supabase/migrations/20260728170000_add_private_station_start_processors.sql': 'e8a75a8e134c2d60c1326c5fdf4b893bbe0c5ea5126d9aeb67d16da72fe6b1c3',
                               'supabase/migrations/20260728180000_add_private_station_return_processor.sql': 'fc06779a18402fa1da0310732f2be82541fc2d7b57ecde4055d3dd35ac3bc4c7',
                               'supabase/migrations/20260728190000_add_private_tablet_batch_orchestrator.sql': 'd66f32d47e79fff728b63934c568f7378b53ce5b06435a2c1334db1a309b8058',
                               'supabase/tests/native_input_freeze.py': '8f798d7859c21276b5c8430d27c4aefcbf706ed75872139d4a840c267d515a6f',
                               'supabase/tests/st02_bike_status_enum_migration.sql': '441b1a60d5d9f9e4a4eb8b9848ebbec686497ffab8b5b9bb336f4573c67c604c',
                               'supabase/tests/st02_bike_status_enum_unknown_value.sql': '35185d217e96422553c19d7c687df7ecc3997f46512f1d37c5784dd6b5bff44c',
                               'supabase/tests/st02_bike_status_rpc_policy.sql': '0efe2b7178c52c3aa82cabed64a49aca2eb344d67f61e45dd7b1a5c5c49edf03',
                               'supabase/tests/st02_complete_ride_canonical_status.sql': 'b73d2234fb336bd438b1cbf30a10f08919c75f431e890500d9cbeca3f69756f3',
                               'supabase/tests/st02_complete_ride_recovery.sql': 'a2196f1df13b9aa466e150811eed8e0ec54ef470c7dd2f74da932abeae5222ac',
                               'supabase/tests/st02_complete_ride_recovery_concurrency.py': 'a645c1c2336982fdbadd8f44df74ff41f66f7c0adb50a18ddce69e3c1fc0d577',
                               'supabase/tests/st02_station_foundation_denials.sql': 'f2cb692bf67694ec886d9c3c2212612497a49ae33941d4488f3ec99642cebb6f',
                               'supabase/tests/st02_station_private_acl.sql': 'fc08d70b684ca26f330cfbffdddba6a1e3b18d39a96980979b03805b522000be',
                               'supabase/tests/st02_station_rental_identity.sql': 'adf5fe0258442f68e7f5b9ade514cf7d60df7f4dacef571aa171fc8a900bd5cc',
                               'supabase/tests/st02_station_rental_identity_native.py': '67dd0c3cd17a60b410e0c0c6b870509c8b6b8602a30e1f8cd45839ff91aeb832',
                               'supabase/tests/st02_station_return.sql': 'ed4cf5d3cd91a0548a5e99376862552d65dabe8a3dd2dd6c17cab1510e992e91',
                               'supabase/tests/st02_station_return_cases.sql': '08ae04cec34a0b2b734f4594a7d4c4ecb5d457e750569278c1c0584d5ce2d815',
                               'supabase/tests/st02_station_return_concurrency.py': 'af92bd9a0bdb07cd1ceae1b2d338d97befd4397de062ef9df6469c693fb0abae',
                               'supabase/tests/st02_station_return_mutations.py': '11c67548af3dce7f5bfd9922a208c294b7096c07588c38008a45eac5119a0cf2',
                               'supabase/tests/st02_station_start.sql': '7f58f4957a30ac4d9a8902c7dc7857949b4adbaadfea897595dff4455abcf267',
                               'supabase/tests/st02_station_start_concurrency.py': '35ad54edf2e2fb4908f034f86e408b488311f883dec6600b38876a6c219e323f',
                               'supabase/tests/st02_station_start_native.py': '758d584e92c0cfe5a6b28885c49a1c9edf403544eb69f37ffb3efd50adea09ee',
                               'supabase/tests/st02_tablet_batch.sql': '95ca917745a7ac1fc2f9ca9f46887aa2b01463547f9c2bfdfaf6cb81edc70dec',
                               'supabase/tests/st02_tablet_batch_concurrency.py': '7eee26f44029e81d8b44bf0ad488b33ac744b451522d1d5ff2400f3e202c5c3d',
                               'supabase/tests/st02_tablet_batch_fixture.sql': 'c22998d61bceb4881f27fd2fc306421fe1303896cf09086d03601ee68297742d',
                               'supabase/tests/st02_tablet_batch_native.py': '43a000faa8b1deb36af4aa2da62918002d3e0905e10601f5ba9b1c9b1144d5d6',
                               'supabase/tests/st02_tablet_sync_constraints.sql': '0050883036d57b86a41af5f95ead32bc1eaf156128eff9fc99a7dc474959e033',
                               'supabase/tests/st02_tablet_sync_constraints_preflight.sql': 'ac33cc6124f237067fd36ea2c1d0573d9f51fc6f584037ac6b560af5a8c5e80b',
                               'supabase/tests/st02_tablet_sync_rls.sql': '63fc951eed3c46a13d71299afa6e37e7f80dfb2c72e6fd3d3575485bb4826d45',
                               'supabase/tests/support/foundation_hashes.json': '3d37334bc4d3f0aeebbdc409ca8c8f14087e5c37a48f9a0ed9701e0ee911dfe7',
                               'supabase/tests/support/native_bootstrap.sql': 'fc400c8542cd3580da0ad7bc799505306cd052e61d0c1acd2c17e22e6b792ba7',
                               'supabase/tests/test_native_input_freeze.py': '70f634782c0c8194ec033ce827f50c6fb6d5628f3385a635f639af14dd799b6d'},
                   'external': {},
                   'effective_environment': {'LANG': 'C'},
                   'effective_pg_config': {},
                   'effective_bootstrap_sha256': 'fc400c8542cd3580da0ad7bc799505306cd052e61d0c1acd2c17e22e6b792ba7'},
  'post_freeze_verified': True,
  'results': [{'case': 'create', 'exit': 0},
              {'case': 'bootstrap', 'exit': 0},
              {'case': '20260411093000_create_profiles.sql', 'exit': 0},
              {'case': '20260411104903_create_wallets.sql', 'exit': 0},
              {'case': '20260411170000_create_bikes.sql', 'exit': 0},
              {'case': '20260413123912_add_admin_roles_to_profiles.sql', 'exit': 0},
              {'case': '20260413132053_allow_admin_wallet_reads.sql', 'exit': 0},
              {'case': '20260413133749_add_bicycle_admin_management_v2.sql', 'exit': 0},
              {'case': '20260414111741_add_profile_link_to_bike_ride_history.sql', 'exit': 0},
              {'case': '20260414112254_remove_public_bike_image_listing_policy.sql', 'exit': 0},
              {'case': '20260414121613_restore_admin_profile_and_wallet_policies.sql', 'exit': 0},
              {'case': '20260414191548_restore_admin_profile_and_wallet_policies.sql', 'exit': 0},
              {'case': '20260420121141_add_active_rider_id_to_bikes.sql', 'exit': 0},
              {'case': '20260421080801_add_ride_revenue_calculation.sql', 'exit': 0},
              {'case': '20260421083232_add_ride_revenue_calculation.sql', 'exit': 0},
              {'case': '20260421180718_align_pricing_labels_to_thb.sql', 'exit': 0},
              {'case': '20260422013000_add_reward_milestones.sql', 'exit': 0},
              {'case': '20260703000000_add_bike_status_events.sql', 'exit': 0},
              {'case': '20260703010000_add_rental_transactions.sql', 'exit': 0},
              {'case': '20260710091611_add_mvp_operational_schema.sql', 'exit': 0},
              {'case': '20260714000000_atomic_bike_status_update.sql', 'exit': 0},
              {'case': '20260714120000_add_phase_d_reporting_infrastructure.sql', 'exit': 0},
              {'case': '20260714130000_add_operational_events.sql', 'exit': 0},
              {'case': '20260714140000_add_sustainability_reporting.sql', 'exit': 0},
              {'case': '20260714150000_add_user_engagement_aggregates.sql', 'exit': 0},
              {'case': '20260714160000_add_workflow_functions.sql', 'exit': 0},
              {'case': '20260714170000_make_bike_status_rpc_params_nullable.sql', 'exit': 0},
              {'case': '20260714200000_workflow_functions_servicerole.sql', 'exit': 0},
              {'case': '20260715050000_fix_geofence_and_report_regeneration.sql', 'exit': 0},
              {'case': '20260722000000_secure_bike_status_rpc.sql', 'exit': 0},
              {'case': '20260722000001_shared_ride_wallet_transactions.sql', 'exit': 0},
              {'case': '20260722083000_add_ride_sharing_schema.sql', 'exit': 0},
              {'case': '20260727000000_expand_bike_status_model.sql', 'exit': 0},
              {'case': '20260727210000_add_tablet_sync_schema.sql', 'exit': 0},
              {'case': '20260728000000_remediate_tablet_sync_constraints.sql', 'exit': 0},
              {'case': '20260728120000_enforce_bike_status_rpc_policy.sql', 'exit': 0},
              {'case': '20260728130000_harden_tablet_sync_rls.sql', 'exit': 0},
              {'case': '20260728140000_fix_complete_ride_canonical_return.sql', 'exit': 0},
              {'case': '20260728150000_add_ride_completion_receipts.sql', 'exit': 0},
              {'case': '20260728160000_add_station_assisted_rental_identity.sql', 'exit': 0},
              {'case': '20260728170000_add_private_station_start_processors.sql', 'exit': 0},
              {'case': '20260728180000_add_private_station_return_processor.sql', 'exit': 0},
              {'case': '20260728190000_add_private_tablet_batch_orchestrator.sql', 'exit': 0},
              {'case': 'initial-st02_station_private_acl.sql', 'exit': 0},
              {'case': 'initial-st02_station_foundation_denials.sql', 'exit': 0},
              {'case': 'initial-st02_station_start.sql', 'exit': 0},
              {'case': 'initial-st02_station_rental_identity.sql', 'exit': 0},
              {'case': 'initial-st02_complete_ride_canonical_status.sql', 'exit': 0},
              {'case': 'initial-st02_complete_ride_recovery.sql', 'exit': 0},
              {'case': 'initial-batch', 'exit': 0},
              {'case': 'initial-return', 'exit': 0},
              {'case': 'replay-migration', 'exit': 0},
              {'case': 'replay-st02_station_private_acl.sql', 'exit': 0},
              {'case': 'replay-st02_station_foundation_denials.sql', 'exit': 0},
              {'case': 'replay-st02_station_start.sql', 'exit': 0},
              {'case': 'replay-st02_station_rental_identity.sql', 'exit': 0},
              {'case': 'replay-st02_complete_ride_canonical_status.sql', 'exit': 0},
              {'case': 'replay-st02_complete_ride_recovery.sql', 'exit': 0},
              {'case': 'replay-batch', 'exit': 0},
              {'case': 'replay-return', 'exit': 0},
              {'case': 'batch-same-batch', 'exit': 0},
              {'case': 'batch-same-local-new-batch', 'exit': 0},
              {'case': 'mutation-manual-override', 'exit': 0},
              {'case': 'mutation-stale-canonical-bike', 'exit': 0},
              {'case': 'mutation-failed-inspection-notes', 'exit': 0},
              {'case': 'mutation-old-return-newer-active', 'exit': 0},
              {'case': 'mutation-maintenance-event-rollback', 'exit': 0},
              {'case': 'mutation-maintenance-audit-rollback', 'exit': 0},
              {'case': 'mutation-audit-block-rollback', 'exit': 0},
              {'case': 'station-first', 'exit': 0},
              {'case': 'mobile-first', 'exit': 0},
              {'case': 'duplicate-start', 'exit': 0},
              {'case': 'return-first', 'exit': 0},
              {'case': 'start-first', 'exit': 0},
              {'case': 'duplicate-return', 'exit': 0},
              {'case': 'recovery-concurrency', 'exit': 0}],
  'step_count': 76}]


class ModernManifestTests(unittest.TestCase):
    def test_malformed_modern_schema_is_rejected(self):
        import copy
        mutations = [
            ("post_freeze_verified", value) for value in [None, False, 0, 1, "true"]
        ] + [("results", value) for value in [None, {}, [], [{}], [None]]]
        mutations += [("results", [{"case": "bad", "exit": value}])
                      for value in [False, True, None, "0", 0.0, 1, -1]]
        mutations += [("step_count", value) for value in [None, False, "76", 0, 1]]
        mutations += [("input_freeze", value) for value in [None, {}, {"sources": {} }]]
        mutations += [("cases", []), ("public_gate", "open"), ("preserved_foundation_count", False)]
        for key, value in mutations:
            with self.subTest(key=key, value=value):
                manifest = copy.deepcopy(REAL_MANIFESTS[1])
                manifest[key] = value
                with self.assertRaises(ValueError):
                    m.validate_manifest(manifest, manifest["hashes"])
        for key in ["results", "post_freeze_verified", "input_freeze", "step_count"]:
            manifest = copy.deepcopy(REAL_MANIFESTS[1])
            del manifest[key]
            with self.subTest(missing=key), self.assertRaises(ValueError):
                m.validate_manifest(manifest, manifest["hashes"])

    def test_freeze_schema_and_modern_result_identity_are_required(self):
        import copy
        for key in ["sources", "external", "effective_environment", "effective_pg_config", "effective_bootstrap_sha256"]:
            for value in [None, False, [], "invalid"]:
                manifest = copy.deepcopy(REAL_MANIFESTS[1])
                manifest["input_freeze"][key] = value
                with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                    m.validate_manifest(manifest, manifest["hashes"])
        for key in ["case", "exit"]:
            manifest = copy.deepcopy(REAL_MANIFESTS[1])
            del manifest["results"][0][key]
            with self.subTest(missing=key), self.assertRaises(ValueError):
                m.validate_manifest(manifest, manifest["hashes"])
        manifest = copy.deepcopy(REAL_MANIFESTS[1])
        manifest["input_freeze"]["sources"][123] = "0" * 64
        with self.assertRaises(ValueError):
            m.validate_manifest(manifest, manifest["hashes"])

    def test_modern_schema_cannot_be_downgraded_to_legacy(self):
        fixture = REAL_MANIFESTS[1]
        with self.assertRaises(ValueError):
            m.validate_manifest({"hashes": fixture["hashes"], "migration_count": 41,
                                 "cases": fixture["results"]}, fixture["hashes"])

    def test_freeze_and_checkout_inventory_are_exact(self):
        import copy
        for section in ["hashes", "sources"]:
            for mutation in ["missing", "extra", "changed"]:
                manifest = copy.deepcopy(REAL_MANIFESTS[1])
                hashes = copy.deepcopy(manifest["hashes"])
                target = manifest["hashes"] if section == "hashes" else manifest["input_freeze"]["sources"]
                key = next(iter(target))
                if mutation == "missing":
                    del target[key]
                elif mutation == "extra":
                    target[("supabase/migrations/" if section == "sources" else "") + "extra.sql"] = "0" * 64
                else:
                    target[key] = "0" * 64
                with self.subTest(section=section, mutation=mutation), self.assertRaises(ValueError):
                    m.validate_manifest(manifest, hashes)

    def test_identical_alias_is_allowed_but_cannot_mask_invalid_status(self):
        import copy
        manifest = copy.deepcopy(REAL_MANIFESTS[1])
        manifest["cases"] = copy.deepcopy(manifest["results"])
        m.validate_manifest(manifest, manifest["hashes"])
        manifest["cases"][0]["exit"] = False
        with self.assertRaises(ValueError):
            m.validate_manifest(manifest, manifest["hashes"])

    def test_legacy_37_cases_remains_supported(self):
        hashes = dict(list(REAL_MANIFESTS[1]["hashes"].items())[:37])
        m.validate_manifest({"hashes": hashes, "migration_count": 37,
                             "cases": [{"exit": 0}]}, hashes)

    def test_real_supported_manifests(self):
        import copy
        for fixture in REAL_MANIFESTS:
            with self.subTest(count=fixture["migration_count"]):
                manifest = copy.deepcopy(fixture)
                before = copy.deepcopy(manifest)
                m.validate_manifest(manifest, manifest["hashes"])
                self.assertEqual(manifest, before)


class ValidationTests(unittest.TestCase):
    def test_main_rejects_dirty_source_before_install(self):
        import json
        from types import SimpleNamespace
        with tempfile.TemporaryDirectory(dir=m.SCRATCH) as directory:
            root = Path(directory)
            (root / "supabase/migrations").mkdir(parents=True)
            migration = root / "supabase/migrations/one.sql"
            migration.write_text("select 1;")
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps({"hashes": {"one.sql": m.hashlib.sha256(migration.read_bytes()).hexdigest()}, "migration_count": 1, "cases": [{"exit": 0}]}))
            with patch.object(m, "ROOT", root), patch.object(m, "META", root), patch.dict(os.environ, {"PG_META_DB_URL": "postgresql://localhost/db", "TYPEGEN_MIGRATION_MANIFEST": str(manifest)}), patch.object(m, "run", side_effect=[SimpleNamespace(stdout=m.REVISION), SimpleNamespace(stdout="!! .env\n")]), patch.object(m, "ensure_dependencies") as install:
                with self.assertRaises(ValueError):
                    m.main()
                install.assert_not_called()

    def test_invalid_generated_output_never_publishes(self):
        import json
        from types import SimpleNamespace
        with tempfile.TemporaryDirectory(dir=m.SCRATCH) as directory:
            root = Path(directory)
            (root / "supabase/migrations").mkdir(parents=True)
            migration = root / "supabase/migrations/one.sql"
            migration.write_text("select 1;")
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps({"hashes": {"one.sql": m.hashlib.sha256(migration.read_bytes()).hexdigest()}, "migration_count": 1, "cases": [{"exit": 0}]}))
            with patch.object(m, "ROOT", root), patch.object(m, "META", root), patch.dict(os.environ, {"PG_META_DB_URL": "postgresql://localhost/db", "TYPEGEN_MIGRATION_MANIFEST": str(manifest)}), patch.object(m, "run", side_effect=[SimpleNamespace(stdout=m.REVISION), SimpleNamespace(stdout=""), SimpleNamespace(stdout="invalid")]), patch.object(m, "ensure_dependencies", return_value={}), patch.object(m, "publish_outputs") as publish:
                with self.assertRaisesRegex(ValueError, "expected public"):
                    m.main()
                publish.assert_not_called()

    def test_staging_failure_leaves_all_outputs_unchanged(self):
        with tempfile.TemporaryDirectory(dir=m.SCRATCH) as directory:
            target = Path(directory) / "client"
            target.write_bytes(b"original")
            with self.assertRaises(FileNotFoundError):
                m.publish_outputs({target: b"new", Path(directory) / "missing/client": b"new"})
            self.assertEqual(target.read_bytes(), b"original")
            self.assertEqual(list(Path(directory).iterdir()), [target])

    def test_failed_rollback_retains_recovery_backup(self):
        with tempfile.TemporaryDirectory(dir=m.SCRATCH) as directory:
            targets = [Path(directory) / name for name in ("web", "mobile")]
            for target in targets:
                target.write_bytes(b"original")
            replace = os.replace
            calls = 0
            def fail_publish_and_rollback(source, target):
                nonlocal calls
                calls += 1
                if calls >= 2:
                    raise OSError("unavailable filesystem")
                return replace(source, target)
            with patch.object(m.os, "replace", side_effect=fail_publish_and_rollback):
                with self.assertRaisesRegex(RuntimeError, "backup"):
                    m.publish_outputs({target: b"new" for target in targets})
            self.assertTrue(any(p.read_bytes() == b"original" for p in Path(directory).glob(".typegen-*")))

    def test_output_failure_rolls_back_both_clients_and_evidence(self):
        with tempfile.TemporaryDirectory(dir=m.SCRATCH) as directory:
            targets = [Path(directory) / name for name in ("web", "mobile", "evidence")]
            for target in targets:
                target.write_bytes(b"original")
            replace = os.replace
            def fail_second(source, target):
                if Path(target) == targets[1]:
                    raise OSError("injected replacement failure")
                return replace(source, target)
            with patch.object(m.os, "replace", side_effect=fail_second):
                with self.assertRaises(OSError):
                    m.publish_outputs({target: b"new" for target in targets})
            self.assertEqual([p.read_bytes() for p in targets], [b"original"] * 3)
            self.assertEqual(sorted(p.name for p in Path(directory).iterdir()), ["evidence", "mobile", "web"])
            m.publish_outputs({target: b"new" for target in targets})
            self.assertEqual([p.read_bytes() for p in targets], [b"new"] * 3)

    def test_dependency_install_receipt_and_cache_validation(self):
        with tempfile.TemporaryDirectory(dir=m.SCRATCH) as directory:
            root = Path(directory)
            (root / "package.json").write_text("{}")
            (root / "package-lock.json").write_text("{}")
            receipt = root / "receipt.json"
            calls = []
            def install(args, **kwargs):
                calls.append(args)
                (root / "node_modules").mkdir(exist_ok=True)
                (root / "node_modules/test.js").write_text("trusted")
            with patch.object(m, "run", side_effect=install):
                m.ensure_dependencies(root, receipt)
                m.ensure_dependencies(root, receipt)
                self.assertEqual(len(calls), 1)
                (root / "node_modules/test.js").write_text("tampered")
                with self.assertRaises(ValueError):
                    m.ensure_dependencies(root, receipt)
                self.assertEqual(len(calls), 1)
            self.assertIn("--ignore-scripts", calls[0])

    def test_dependency_cache_detects_tampering(self):
        with tempfile.TemporaryDirectory(dir=m.SCRATCH) as directory:
            root = Path(directory)
            (root / "node_modules").mkdir()
            dependency = root / "node_modules/module.js"
            dependency.write_text("original")
            first = m.dependency_digest(root / "node_modules")
            dependency.write_text("modified")
            self.assertNotEqual(first, m.dependency_digest(root / "node_modules"))
            dependency.unlink()
            dependency.symlink_to("/etc/passwd")
            with self.assertRaises(ValueError):
                m.dependency_digest(root / "node_modules")

    def test_real_npm_config_uses_distinct_empty_files(self):
        import subprocess
        with tempfile.TemporaryDirectory(dir=m.SCRATCH) as directory:
            root = Path(directory)
            home = root / "home"
            home.mkdir()
            (home / ".npmrc").write_text("registry=https://credentials.invalid/\n")
            with patch.dict(os.environ, {"HOME": str(home), "npm_config_registry": "https://inherited.invalid/"}):
                with m.generator_environment() as env:
                    user = Path(env["npm_config_userconfig"])
                    global_config = Path(env["npm_config_globalconfig"])
                    self.assertNotEqual(user.resolve(), global_config.resolve())
                    self.assertEqual(user.read_bytes(), b"")
                    self.assertEqual(global_config.read_bytes(), b"")
                    result = subprocess.run(["npm", "config", "get", "registry", "--offline"], cwd=root,
                                            env=env, text=True, capture_output=True)
                    self.assertEqual(result.returncode, 0, result.stderr)
                    self.assertEqual(result.stdout.strip(), "https://registry.npmjs.org/")
                self.assertFalse(user.exists())
                self.assertFalse(global_config.exists())

    def test_generator_environment_is_allowlisted(self):
        with patch.dict(os.environ, {"PG_META_DB_HOST": "evil", "PGHOST": "evil", "NODE_OPTIONS": "--import=evil", "npm_config_registry": "evil", "PG_META_GENERATE_TYPES_INCLUDED_SCHEMAS": "private", "PATH": "/bin"}, clear=True):
            with m.generator_environment("postgresql://localhost/db") as generated_env:
                env = generated_env.copy()
        self.assertEqual(env["PG_META_DB_URL"], "postgresql://localhost/db")
        self.assertEqual(env["PG_META_GENERATE_TYPES_INCLUDED_SCHEMAS"], "public")
        for key in ["PG_META_DB_HOST", "PGHOST", "NODE_OPTIONS", "npm_config_registry"]:
            self.assertNotIn(key, env)

    def test_manifest_requires_matching_nonempty_success(self):
        hashes = {"one.sql": "abc"}
        for cases in [[], [{"exit": 1}], [{"exit": False}], [{}]]:
            with self.subTest(cases=cases), self.assertRaises(ValueError):
                m.validate_manifest({"hashes": hashes, "migration_count": 1, "cases": cases}, hashes)
        with self.assertRaises(ValueError):
            m.validate_manifest({"hashes": {}, "migration_count": 1, "cases": [{"exit": 0}]}, hashes)
        m.validate_manifest({"hashes": hashes, "migration_count": 1, "cases": [{"exit": 0}]}, hashes)

    def test_local_only_urls_and_redacted_errors(self):
        for url in ["postgresql://u:secret@remote.example/db", "postgresql://localhost/db?host=evil", "postgresql://localhost/db?host=/tmp/x&host=evil", "postgresql://localhost/db?hostaddr=8.8.8.8", "not a URL"]:
            with self.subTest(url=url), self.assertRaises(ValueError) as error:
                m.validate_database_url(url)
            self.assertNotIn("secret", str(error.exception))
        for url in ["postgresql://u@127.0.0.1/db", "postgresql://u@[::1]/db", "postgresql://u@localhost/db?host=/tmp/socket"]:
            self.assertEqual(m.validate_database_url(url), url)


if __name__ == "__main__":
    unittest.main()
