export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      learning_sessions: {
        Row: {
          id: string;
          user_id: string;
          status: string;
          phase: string;
          activity_id: string | null;
          challenge_id: string | null;
          plan: Json;
          last_verification: Json | null;
          started_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          status?: string;
          phase?: string;
          activity_id?: string | null;
          challenge_id?: string | null;
          plan?: Json;
          last_verification?: Json | null;
          started_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: string;
          phase?: string;
          activity_id?: string | null;
          challenge_id?: string | null;
          plan?: Json;
          last_verification?: Json | null;
          started_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      learning_session_events: {
        Row: {
          id: number;
          session_id: string;
          user_id: string;
          event_type: string;
          phase: string;
          data: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          session_id: string;
          user_id: string;
          event_type: string;
          phase: string;
          data?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          session_id?: string;
          user_id?: string;
          event_type?: string;
          phase?: string;
          data?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      generated_exercises: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          title: string;
          definition: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          kind: string;
          title: string;
          definition?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: string;
          title?: string;
          definition?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      challenge_definitions: {
        Row: {
          created_at: string;
          difficulty: number;
          id: string;
          objective: string;
          prerequisites: string[];
          required_skills: string[];
          sequence_order: number;
          story_intro: string;
          title: string;
          updated_at: string;
          xp_reward: number;
        };
        Insert: {
          created_at?: string;
          difficulty?: number;
          id: string;
          objective: string;
          prerequisites?: string[];
          required_skills?: string[];
          sequence_order: number;
          story_intro: string;
          title: string;
          updated_at?: string;
          xp_reward?: number;
        };
        Update: {
          created_at?: string;
          difficulty?: number;
          id?: string;
          objective?: string;
          prerequisites?: string[];
          required_skills?: string[];
          sequence_order?: number;
          story_intro?: string;
          title?: string;
          updated_at?: string;
          xp_reward?: number;
        };
        Relationships: [];
      };
      runtime_nodes: {
        Row: {
          node_id: string;
          backend_id: string;
          runtime_class: string;
          runtime_version: string;
          capabilities: Json;
          max_environments: number | null;
          active_environments: number;
          status: string;
          enabled: boolean;
          credential_hash: string;
          registration_generation: number;
          registered_at: string;
          last_heartbeat_at: string;
          heartbeat_ttl_seconds: number;
          metadata: Json;
        };
        Insert: {
          node_id: string;
          backend_id: string;
          runtime_class: string;
          runtime_version: string;
          capabilities?: Json;
          max_environments?: number | null;
          active_environments?: number;
          status?: string;
          enabled?: boolean;
          credential_hash: string;
          registration_generation?: number;
          registered_at?: string;
          last_heartbeat_at?: string;
          heartbeat_ttl_seconds?: number;
          metadata?: Json;
        };
        Update: {
          node_id?: string;
          backend_id?: string;
          runtime_class?: string;
          runtime_version?: string;
          capabilities?: Json;
          max_environments?: number | null;
          active_environments?: number;
          status?: string;
          enabled?: boolean;
          credential_hash?: string;
          registration_generation?: number;
          registered_at?: string;
          last_heartbeat_at?: string;
          heartbeat_ttl_seconds?: number;
          metadata?: Json;
        };
        Relationships: [];
      };
      runtime_node_leases: {
        Row: {
          lease_id: string;
          node_id: string;
          owner_id: string;
          acquired_at: string;
          heartbeat_at: string;
          expires_at: string;
        };
        Insert: {
          lease_id: string;
          node_id: string;
          owner_id: string;
          acquired_at?: string;
          heartbeat_at?: string;
          expires_at: string;
        };
        Update: {
          lease_id?: string;
          node_id?: string;
          owner_id?: string;
          acquired_at?: string;
          heartbeat_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
      runtime_operations: {
        Row: {
          operation_id: string;
          idempotency_key: string;
          kind: string;
          environment_id: string;
          node_id: string | null;
          status: string;
          attempt: number;
          created_at: string;
          updated_at: string;
          lease_until: string | null;
          owner_id: string | null;
          result_ref: string | null;
          error: string | null;
        };
        Insert: {
          operation_id: string;
          idempotency_key: string;
          kind: string;
          environment_id: string;
          node_id?: string | null;
          status?: string;
          attempt?: number;
          created_at?: string;
          updated_at?: string;
          lease_until?: string | null;
          owner_id?: string | null;
          result_ref?: string | null;
          error?: string | null;
        };
        Update: {
          operation_id?: string;
          idempotency_key?: string;
          kind?: string;
          environment_id?: string;
          node_id?: string | null;
          status?: string;
          attempt?: number;
          created_at?: string;
          updated_at?: string;
          lease_until?: string | null;
          owner_id?: string | null;
          result_ref?: string | null;
          error?: string | null;
        };
        Relationships: [];
      };
      lab_command_events: {
        Row: {
          blocked_reason: string | null;
          challenge_id: string | null;
          created_at: string;
          cwd_after: string;
          cwd_before: string;
          duration_ms: number;
          exit_code: number;
          id: string;
          input: string;
          lab_instance_id: string;
          metadata: Json;
          provider: string;
          state_change_ref: Json;
          stderr: string;
          stdout: string;
          user_id: string;
        };
        Insert: {
          blocked_reason?: string | null;
          challenge_id?: string | null;
          created_at?: string;
          cwd_after?: string;
          cwd_before?: string;
          duration_ms?: number;
          exit_code?: number;
          id?: string;
          input: string;
          lab_instance_id: string;
          metadata?: Json;
          provider: string;
          state_change_ref?: Json;
          stderr?: string;
          stdout?: string;
          user_id: string;
        };
        Update: {
          blocked_reason?: string | null;
          challenge_id?: string | null;
          created_at?: string;
          cwd_after?: string;
          cwd_before?: string;
          duration_ms?: number;
          exit_code?: number;
          id?: string;
          input?: string;
          lab_instance_id?: string;
          metadata?: Json;
          provider?: string;
          state_change_ref?: Json;
          stderr?: string;
          stdout?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lab_command_events_lab_instance_id_fkey";
            columns: ["lab_instance_id"];
            isOneToOne: false;
            referencedRelation: "lab_instances";
            referencedColumns: ["id"];
          },
        ];
      };
      lab_jobs: {
        Row: {
          id: string;
          instance_id: string;
          user_id: string;
          kind: string;
          status: string;
          attempts: number;
          max_attempts: number;
          priority: number;
          available_at: string;
          created_at: string;
          updated_at: string;
          lease_until: string | null;
          worker_id: string | null;
          last_error: string | null;
        };
        Insert: {
          id: string;
          instance_id: string;
          user_id: string;
          kind: string;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          priority?: number;
          available_at?: string;
          created_at?: string;
          updated_at?: string;
          lease_until?: string | null;
          worker_id?: string | null;
          last_error?: string | null;
        };
        Update: {
          id?: string;
          instance_id?: string;
          user_id?: string;
          kind?: string;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          priority?: number;
          available_at?: string;
          created_at?: string;
          updated_at?: string;
          lease_until?: string | null;
          worker_id?: string | null;
          last_error?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lab_jobs_instance_id_fkey";
            columns: ["instance_id"];
            isOneToOne: false;
            referencedRelation: "lab_instances";
            referencedColumns: ["id"];
          },
        ];
      };
      lab_control_operations: {
        Row: {
          id: string;
          instance_id: string;
          user_id: string;
          kind: string;
          status: string;
          idempotency_key: string;
          attempt: number;
          created_at: string;
          updated_at: string;
          lease_until: string | null;
          worker_id: string | null;
          result_ref: string | null;
          error: string | null;
        };
        Insert: {
          id: string;
          instance_id: string;
          user_id: string;
          kind: string;
          status?: string;
          idempotency_key: string;
          attempt?: number;
          created_at?: string;
          updated_at?: string;
          lease_until?: string | null;
          worker_id?: string | null;
          result_ref?: string | null;
          error?: string | null;
        };
        Update: {
          id?: string;
          instance_id?: string;
          user_id?: string;
          kind?: string;
          status?: string;
          idempotency_key?: string;
          attempt?: number;
          created_at?: string;
          updated_at?: string;
          lease_until?: string | null;
          worker_id?: string | null;
          result_ref?: string | null;
          error?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lab_control_operations_instance_id_fkey";
            columns: ["instance_id"];
            isOneToOne: false;
            referencedRelation: "lab_instances";
            referencedColumns: ["id"];
          },
        ];
      };
      lab_control_operation_events: {
        Row: {
          id: number;
          operation_id: string;
          instance_id: string;
          user_id: string;
          event_type: string;
          from_status: string | null;
          to_status: string | null;
          data: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          operation_id: string;
          instance_id: string;
          user_id: string;
          event_type: string;
          from_status?: string | null;
          to_status?: string | null;
          data?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          operation_id?: string;
          instance_id?: string;
          user_id?: string;
          event_type?: string;
          from_status?: string | null;
          to_status?: string | null;
          data?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lab_control_operation_events_operation_id_fkey";
            columns: ["operation_id"];
            isOneToOne: false;
            referencedRelation: "lab_control_operations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_control_operation_events_instance_id_fkey";
            columns: ["instance_id"];
            isOneToOne: false;
            referencedRelation: "lab_instances";
            referencedColumns: ["id"];
          },
        ];
      };
      lab_runtime_identities: {
        Row: {
          runtime_id: string;
          instance_id: string;
          lab_id: string;
          user_id: string;
          node_id: string | null;
          binding_generation: number;
          status: string;
          credential_version: number;
          issued_at: string;
          expires_at: string;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          runtime_id?: string;
          instance_id: string;
          lab_id: string;
          user_id: string;
          node_id?: string | null;
          binding_generation?: number;
          status?: string;
          credential_version?: number;
          issued_at?: string;
          expires_at: string;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          runtime_id?: string;
          instance_id?: string;
          lab_id?: string;
          user_id?: string;
          node_id?: string | null;
          binding_generation?: number;
          status?: string;
          credential_version?: number;
          issued_at?: string;
          expires_at?: string;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lab_runtime_identities_instance_id_fkey";
            columns: ["instance_id"];
            isOneToOne: true;
            referencedRelation: "lab_instances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_runtime_identities_lab_id_fkey";
            columns: ["lab_id"];
            isOneToOne: false;
            referencedRelation: "learner_labs";
            referencedColumns: ["id"];
          },
        ];
      };
      lab_runtime_credentials: {
        Row: {
          credential_id: string;
          runtime_id: string;
          credential_version: number;
          secret_hash: string;
          issued_at: string;
          expires_at: string;
          revoked_at: string | null;
        };
        Insert: {
          credential_id?: string;
          runtime_id: string;
          credential_version: number;
          secret_hash: string;
          issued_at?: string;
          expires_at: string;
          revoked_at?: string | null;
        };
        Update: {
          credential_id?: string;
          runtime_id?: string;
          credential_version?: number;
          secret_hash?: string;
          issued_at?: string;
          expires_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lab_runtime_credentials_runtime_id_fkey";
            columns: ["runtime_id"];
            isOneToOne: false;
            referencedRelation: "lab_runtime_identities";
            referencedColumns: ["runtime_id"];
          },
        ];
      };
      lab_isolation_verifications: {
        Row: {
          verification_id: string;
          runtime_id: string;
          instance_id: string;
          lab_id: string;
          user_id: string;
          binding_generation: number;
          state: string;
          checks: Json;
          reason: string;
          checked_at: string;
          created_at: string;
        };
        Insert: {
          verification_id?: string;
          runtime_id: string;
          instance_id: string;
          lab_id: string;
          user_id: string;
          binding_generation: number;
          state: string;
          checks?: Json;
          reason: string;
          checked_at?: string;
          created_at?: string;
        };
        Update: {
          verification_id?: string;
          runtime_id?: string;
          instance_id?: string;
          lab_id?: string;
          user_id?: string;
          binding_generation?: number;
          state?: string;
          checks?: Json;
          reason?: string;
          checked_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lab_isolation_verifications_runtime_id_fkey";
            columns: ["runtime_id"];
            isOneToOne: false;
            referencedRelation: "lab_runtime_identities";
            referencedColumns: ["runtime_id"];
          },
          {
            foreignKeyName: "lab_isolation_verifications_instance_id_fkey";
            columns: ["instance_id"];
            isOneToOne: false;
            referencedRelation: "lab_instances";
            referencedColumns: ["id"];
          },
        ];
      };
      lab_network_policies: {
        Row: {
          lab_id: string;
          user_id: string;
          network_mode: string;
          egress_allowlist: Json;
          inter_lab_access: boolean;
          control_plane_access: boolean;
          host_network_access: boolean;
          updated_at: string;
        };
        Insert: {
          lab_id: string;
          user_id: string;
          network_mode?: string;
          egress_allowlist?: Json;
          inter_lab_access?: boolean;
          control_plane_access?: boolean;
          host_network_access?: boolean;
          updated_at?: string;
        };
        Update: {
          lab_id?: string;
          user_id?: string;
          network_mode?: string;
          egress_allowlist?: Json;
          inter_lab_access?: boolean;
          control_plane_access?: boolean;
          host_network_access?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lab_network_policies_lab_id_fkey";
            columns: ["lab_id"];
            isOneToOne: true;
            referencedRelation: "learner_labs";
            referencedColumns: ["id"];
          },
        ];
      };
      lab_instances: {
        Row: {
          created_at: string;
          environment_id: string;
          expires_at: string | null;
          id: string;
          lab_id: string;
          last_active_at: string;
          lease_expires_at: string | null;
          last_heartbeat_at: string | null;
          lease_token_hash: string | null;
          metadata: Json;
          runtime_node_id: string | null;
          runtime_binding_generation: number;
          resource_policy: Json;
          last_reconciled_at: string | null;
          last_health_at: string | null;
          provider: string;
          snapshot_id: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          environment_id: string;
          expires_at?: string | null;
          id?: string;
          lab_id: string;
          last_active_at?: string;
          lease_expires_at?: string | null;
          last_heartbeat_at?: string | null;
          lease_token_hash?: string | null;
          metadata?: Json;
          runtime_node_id?: string | null;
          runtime_binding_generation?: number;
          resource_policy?: Json;
          last_reconciled_at?: string | null;
          last_health_at?: string | null;
          provider?: string;
          snapshot_id?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          environment_id?: string;
          expires_at?: string | null;
          id?: string;
          lab_id?: string;
          last_active_at?: string;
          lease_expires_at?: string | null;
          last_heartbeat_at?: string | null;
          lease_token_hash?: string | null;
          metadata?: Json;
          runtime_node_id?: string | null;
          runtime_binding_generation?: number;
          resource_policy?: Json;
          last_reconciled_at?: string | null;
          last_health_at?: string | null;
          provider?: string;
          snapshot_id?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lab_instances_lab_id_fkey";
            columns: ["lab_id"];
            isOneToOne: false;
            referencedRelation: "learner_labs";
            referencedColumns: ["id"];
          },
        ];
      };
      lab_environment_state: {
        Row: {
          artifact_ref: string | null;
          artifact_version: number;
          created_at: string;
          destroyed_at: string | null;
          environment_generation: number;
          environment_id: string;
          failure_reason: string | null;
          instance_id: string;
          integrity_fingerprint: string | null;
          integrity_status: string;
          lab_id: string;
          last_persisted_at: string | null;
          last_restored_at: string | null;
          last_verified_at: string | null;
          state: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          artifact_ref?: string | null;
          artifact_version?: number;
          created_at?: string;
          destroyed_at?: string | null;
          environment_generation?: number;
          environment_id: string;
          failure_reason?: string | null;
          instance_id: string;
          integrity_fingerprint?: string | null;
          integrity_status?: string;
          lab_id: string;
          last_persisted_at?: string | null;
          last_restored_at?: string | null;
          last_verified_at?: string | null;
          state: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          artifact_ref?: string | null;
          artifact_version?: number;
          created_at?: string;
          destroyed_at?: string | null;
          environment_generation?: number;
          environment_id?: string;
          failure_reason?: string | null;
          instance_id?: string;
          integrity_fingerprint?: string | null;
          integrity_status?: string;
          lab_id?: string;
          last_persisted_at?: string | null;
          last_restored_at?: string | null;
          last_verified_at?: string | null;
          state?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      lab_environment_events: {
        Row: {
          artifact_version: number;
          created_at: string;
          data: Json;
          environment_generation: number;
          environment_id: string;
          event_type: string;
          id: number;
          instance_id: string;
          user_id: string;
        };
        Insert: {
          artifact_version: number;
          created_at?: string;
          data?: Json;
          environment_generation: number;
          environment_id: string;
          event_type: string;
          id?: number;
          instance_id: string;
          user_id: string;
        };
        Update: {
          artifact_version?: number;
          created_at?: string;
          data?: Json;
          environment_generation?: number;
          environment_id?: string;
          event_type?: string;
          id?: number;
          instance_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      lab_terminal_sessions: {
        Row: {
          session_id: string;
          user_id: string;
          instance_id: string;
          runtime_id: string;
          lab_id: string;
          shell: string;
          cwd: string;
          state: string;
          binding_generation: number;
          runtime_lifecycle_generation: number;
          created_at: string;
          updated_at: string;
          last_seen_at: string | null;
          expires_at: string;
          closed_at: string | null;
        };
        Insert: {
          session_id: string;
          user_id: string;
          instance_id: string;
          runtime_id: string;
          lab_id: string;
          shell: string;
          cwd: string;
          state?: string;
          binding_generation: number;
          runtime_lifecycle_generation: number;
          created_at?: string;
          updated_at?: string;
          last_seen_at?: string | null;
          expires_at: string;
          closed_at?: string | null;
        };
        Update: {
          session_id?: string;
          user_id?: string;
          instance_id?: string;
          runtime_id?: string;
          lab_id?: string;
          shell?: string;
          cwd?: string;
          state?: string;
          binding_generation?: number;
          runtime_lifecycle_generation?: number;
          created_at?: string;
          updated_at?: string;
          last_seen_at?: string | null;
          expires_at?: string;
          closed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lab_terminal_sessions_instance_id_fkey";
            columns: ["instance_id"];
            isOneToOne: false;
            referencedRelation: "lab_instances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_terminal_sessions_lab_id_fkey";
            columns: ["lab_id"];
            isOneToOne: false;
            referencedRelation: "learner_labs";
            referencedColumns: ["id"];
          },
        ];
      };
      lab_terminal_session_events: {
        Row: {
          id: number;
          session_id: string;
          user_id: string;
          instance_id: string;
          event_type: string;
          data: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          session_id: string;
          user_id: string;
          instance_id: string;
          event_type: string;
          data?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          session_id?: string;
          user_id?: string;
          instance_id?: string;
          event_type?: string;
          data?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      lab_world_objects: {
        Row: {
          active: boolean;
          created_at: string;
          created_by_challenge: string | null;
          current_state: Json;
          lab_id: string;
          last_modified_by_challenge: string | null;
          name: string;
          object_id: string;
          object_type: string;
          path: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by_challenge?: string | null;
          current_state?: Json;
          lab_id: string;
          last_modified_by_challenge?: string | null;
          name: string;
          object_id?: string;
          object_type: string;
          path: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by_challenge?: string | null;
          current_state?: Json;
          lab_id?: string;
          last_modified_by_challenge?: string | null;
          name?: string;
          object_id?: string;
          object_type?: string;
          path?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lab_world_objects_lab_id_fkey";
            columns: ["lab_id"];
            isOneToOne: false;
            referencedRelation: "learner_labs";
            referencedColumns: ["id"];
          },
        ];
      };
      learner_challenge_attempts: {
        Row: {
          attempts: number;
          best_score: number;
          challenge_id: string;
          completed_at: string | null;
          created_at: string;
          evidence: Json;
          id: string;
          started_at: string;
          status: string;
          updated_at: string;
          user_id: string;
          xp_awarded: number;
        };
        Insert: {
          attempts?: number;
          best_score?: number;
          challenge_id: string;
          completed_at?: string | null;
          created_at?: string;
          evidence?: Json;
          id?: string;
          started_at?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
          xp_awarded?: number;
        };
        Update: {
          attempts?: number;
          best_score?: number;
          challenge_id?: string;
          completed_at?: string | null;
          created_at?: string;
          evidence?: Json;
          id?: string;
          started_at?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
          xp_awarded?: number;
        };
        Relationships: [];
      };
      learner_challenge_events: {
        Row: {
          challenge_id: string;
          created_at: string;
          id: string;
          kind: string;
          payload: Json;
          user_id: string;
        };
        Insert: {
          challenge_id: string;
          created_at?: string;
          id?: string;
          kind: string;
          payload?: Json;
          user_id: string;
        };
        Update: {
          challenge_id?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          payload?: Json;
          user_id?: string;
        };
        Relationships: [];
      };
      learner_hint_usage: {
        Row: {
          challenge_id: string;
          created_at: string;
          hint_level: number;
          id: string;
          user_id: string;
        };
        Insert: {
          challenge_id: string;
          created_at?: string;
          hint_level: number;
          id?: string;
          user_id: string;
        };
        Update: {
          challenge_id?: string;
          created_at?: string;
          hint_level?: number;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      learner_labs: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          lab_key: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          lab_key?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          lab_key?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      learner_preferences: {
        Row: {
          created_at: string;
          id: string;
          notify_achievements: boolean;
          notify_daily_drill: boolean;
          notify_email_digest: boolean;
          notify_squad_activity: boolean;
          notify_streak_risk: boolean;
          preferred_tutor_language: Database["public"]["Enums"]["tutor_language"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notify_achievements?: boolean;
          notify_daily_drill?: boolean;
          notify_email_digest?: boolean;
          notify_squad_activity?: boolean;
          notify_streak_risk?: boolean;
          preferred_tutor_language?: Database["public"]["Enums"]["tutor_language"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          notify_achievements?: boolean;
          notify_daily_drill?: boolean;
          notify_email_digest?: boolean;
          notify_squad_activity?: boolean;
          notify_streak_risk?: boolean;
          preferred_tutor_language?: Database["public"]["Enums"]["tutor_language"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      learner_profiles: {
        Row: {
          avatar_ref: string | null;
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          linux_comfort_level: Database["public"]["Enums"]["linux_comfort_level"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_ref?: string | null;
          created_at?: string;
          display_name: string;
          email: string;
          id?: string;
          linux_comfort_level?: Database["public"]["Enums"]["linux_comfort_level"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_ref?: string | null;
          created_at?: string;
          display_name?: string;
          email?: string;
          id?: string;
          linux_comfort_level?: Database["public"]["Enums"]["linux_comfort_level"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      learner_progression: {
        Row: {
          challenges_completed: number;
          created_at: string;
          id: string;
          labs_completed: number;
          level: number;
          total_xp: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          challenges_completed?: number;
          created_at?: string;
          id?: string;
          labs_completed?: number;
          level?: number;
          total_xp?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          challenges_completed?: number;
          created_at?: string;
          id?: string;
          labs_completed?: number;
          level?: number;
          total_xp?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      learner_skill_memory: {
        Row: {
          attempts: number;
          confidence: number;
          created_at: string;
          hint_dependency: number;
          id: string;
          last_practiced: string | null;
          mastery: number;
          next_review: string | null;
          recent_mistakes: string[];
          recent_score: number | null;
          retention: number;
          independence: number;
          speed_score: number;
          consistency: number;
          difficulty_rating: number;
          evidence_count: number;
          skill_id: string;
          successful_attempts: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempts?: number;
          confidence?: number;
          created_at?: string;
          hint_dependency?: number;
          id?: string;
          last_practiced?: string | null;
          mastery?: number;
          next_review?: string | null;
          recent_mistakes?: string[];
          recent_score?: number | null;
          retention?: number;
          independence?: number;
          speed_score?: number;
          consistency?: number;
          difficulty_rating?: number;
          evidence_count?: number;
          skill_id: string;
          successful_attempts?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          confidence?: number;
          created_at?: string;
          hint_dependency?: number;
          id?: string;
          last_practiced?: string | null;
          mastery?: number;
          next_review?: string | null;
          recent_mistakes?: string[];
          recent_score?: number | null;
          retention?: number;
          independence?: number;
          speed_score?: number;
          consistency?: number;
          difficulty_rating?: number;
          evidence_count?: number;
          skill_id?: string;
          successful_attempts?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      learning_narrative_events: {
        Row: {
          challenge_id: string | null;
          created_at: string;
          event_id: string;
          event_type: string;
          importance: number;
          related_object_ids: string[];
          related_skill_ids: string[];
          summary: string;
          user_id: string;
        };
        Insert: {
          challenge_id?: string | null;
          created_at?: string;
          event_id?: string;
          event_type: string;
          importance?: number;
          related_object_ids?: string[];
          related_skill_ids?: string[];
          summary: string;
          user_id: string;
        };
        Update: {
          challenge_id?: string | null;
          created_at?: string;
          event_id?: string;
          event_type?: string;
          importance?: number;
          related_object_ids?: string[];
          related_skill_ids?: string[];
          summary?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      lab_exercise_attempts: {
        Row: {
          attempt_id: string;
          user_id: string;
          lab_id: string;
          environment_id: string;
          exercise_id: string;
          question_id: string;
          question_variant_id: string | null;
          exercise_version: number;
          semantic_fingerprint: string;
          completion_mode: string | null;
          consumed: boolean;
          hints_used: number;
          solution_revealed: boolean;
          verdict: string;
          created_at: string;
        };
        Insert: {
          attempt_id: string;
          user_id: string;
          lab_id: string;
          environment_id: string;
          exercise_id: string;
          question_id: string;
          question_variant_id: string | null;
          exercise_version: number;
          semantic_fingerprint: string;
          completion_mode?: string | null;
          consumed?: boolean;
          hints_used?: number;
          solution_revealed?: boolean;
          verdict: string;
          created_at?: string;
        };
        Update: {
          attempt_id?: string;
          user_id?: string;
          lab_id?: string;
          environment_id?: string;
          exercise_id?: string;
          exercise_version?: number;
          semantic_fingerprint?: string;
          completion_mode?: string | null;
          consumed?: boolean;
          hints_used?: number;
          solution_revealed?: boolean;
          verdict?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      lab_exercise_verifications: {
        Row: {
          id: number;
          attempt_id: string;
          user_id: string;
          environment_id: string;
          environment_generation: number;
          runtime_lifecycle_generation: number | null;
          verifier_version: string;
          contract_version: number;
          verdict: string;
          score: number;
          failure_classification: string | null;
          evidence: Json;
          verified_at: string;
        };
        Insert: {
          id?: number;
          attempt_id: string;
          user_id: string;
          environment_id: string;
          environment_generation: number;
          runtime_lifecycle_generation?: number | null;
          verifier_version: string;
          contract_version: number;
          verdict: string;
          score: number;
          failure_classification?: string | null;
          evidence?: Json;
          verified_at?: string;
        };
        Update: {
          id?: number;
          attempt_id?: string;
          user_id?: string;
          environment_id?: string;
          environment_generation?: number;
          runtime_lifecycle_generation?: number | null;
          verifier_version?: string;
          contract_version?: number;
          verdict?: string;
          score?: number;
          failure_classification?: string | null;
          evidence?: Json;
          verified_at?: string;
        };
        Relationships: [];
      };
      lab_exercise_requirement_results: {
        Row: {
          id: number;
          verification_id: number;
          user_id: string;
          requirement_id: string;
          met: boolean;
          evidence: string;
          observed: Json | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          verification_id: number;
          user_id: string;
          requirement_id: string;
          met: boolean;
          evidence: string;
          observed?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          verification_id?: number;
          user_id?: string;
          requirement_id?: string;
          met?: boolean;
          evidence?: string;
          observed?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      register_runtime_node: {
        Args: {
          p_node_id: string;
          p_backend_id: string;
          p_runtime_class: string;
          p_runtime_version: string;
          p_capabilities: Json;
          p_max_environments: number | null;
          p_credential_hash: string;
          p_metadata?: Json;
          p_now?: string;
        };
        Returns: Database["public"]["Tables"]["runtime_nodes"]["Row"][];
      };
      heartbeat_runtime_node: {
        Args: {
          p_node_id: string;
          p_registration_generation: number;
          p_credential_hash: string;
          p_now?: string;
        };
        Returns: Database["public"]["Tables"]["runtime_nodes"]["Row"][];
      };
      expire_runtime_nodes: {
        Args: { p_now?: string };
        Returns: number;
      };
      begin_runtime_operation: {
        Args: {
          p_operation_id: string;
          p_idempotency_key: string;
          p_kind: string;
          p_environment_id: string;
          p_node_id?: string | null;
          p_now?: string;
        };
        Returns: Database["public"]["Tables"]["runtime_operations"]["Row"][];
      };
      claim_runtime_operation: {
        Args: {
          p_operation_id: string;
          p_owner_id: string;
          p_lease_seconds?: number;
          p_now?: string;
        };
        Returns: Database["public"]["Tables"]["runtime_operations"]["Row"][];
      };
      heartbeat_runtime_operation: {
        Args: {
          p_operation_id: string;
          p_owner_id: string;
          p_lease_seconds?: number;
          p_now?: string;
        };
        Returns: Database["public"]["Tables"]["runtime_operations"]["Row"][];
      };
      finish_runtime_operation: {
        Args: {
          p_operation_id: string;
          p_owner_id: string;
          p_status: string;
          p_result_ref?: string | null;
          p_error?: string | null;
          p_now?: string;
        };
        Returns: Database["public"]["Tables"]["runtime_operations"]["Row"][];
      };
      recover_runtime_operations: {
        Args: { p_now?: string };
        Returns: number;
      };
      claim_runtime_request_nonce: {
        Args: {
          p_nonce: string;
          p_node_id: string;
          p_operation_id: string;
          p_expires_at: string;
          p_now?: string;
        };
        Returns: boolean;
      };
      reconcile_runtime_operation: {
        Args: { p_operation_id: string; p_result_ref?: string | null; p_now?: string };
        Returns: Database["public"]["Tables"]["runtime_operations"]["Row"][];
      };
      list_lab_supervision_candidates: {
        Args: {
          p_now?: string;
          p_reconcile_after_seconds?: number;
          p_limit?: number;
        };
        Returns: {
          created_at: string;
          environment_id: string;
          expires_at: string | null;
          id: string;
          lab_id: string;
          last_active_at: string;
          lease_expires_at: string | null;
          last_heartbeat_at: string | null;
          lease_token_hash: string | null;
          metadata: Json;
          provider: string;
          snapshot_id: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        }[];
      };
      enqueue_expire_lab_job: {
        Args: { p_instance_id: string; p_user_id: string; p_now?: string };
        Returns: {
          id: string;
          instance_id: string;
          user_id: string;
          kind: string;
          status: string;
          attempts: number;
          max_attempts: number;
          priority: number;
          available_at: string;
          created_at: string;
          updated_at: string;
          lease_until: string | null;
          worker_id: string | null;
          last_error: string | null;
        }[];
      };
      enqueue_reconcile_lab_job: {
        Args: {
          p_instance_id: string;
          p_user_id: string;
          p_now?: string;
        };
        Returns: {
          id: string;
          instance_id: string;
          user_id: string;
          kind: string;
          status: string;
          attempts: number;
          max_attempts: number;
          priority: number;
          available_at: string;
          created_at: string;
          updated_at: string;
          lease_until: string | null;
          worker_id: string | null;
          last_error: string | null;
        }[];
      };
      enqueue_lab_job: {
        Args: {
          p_id: string;
          p_instance_id: string;
          p_user_id: string;
          p_kind: string;
          p_priority?: number;
          p_max_attempts?: number;
          p_available_at?: string;
        };
        Returns: {
          id: string;
          instance_id: string;
          user_id: string;
          kind: string;
          status: string;
          attempts: number;
          max_attempts: number;
          priority: number;
          available_at: string;
          created_at: string;
          updated_at: string;
          lease_until: string | null;
          worker_id: string | null;
          last_error: string | null;
        }[];
      };
      cancel_queued_lab_job: {
        Args: {
          p_job_id: string;
          p_user_id: string;
          p_now?: string;
        };
        Returns: {
          id: string;
          instance_id: string;
          user_id: string;
          kind: string;
          status: string;
          attempts: number;
          max_attempts: number;
          priority: number;
          available_at: string;
          created_at: string;
          updated_at: string;
          lease_until: string | null;
          worker_id: string | null;
          last_error: string | null;
        }[];
      };
      claim_next_lab_job: {
        Args: {
          p_worker_id: string;
          p_lease_seconds?: number;
          p_now?: string;
        };
        Returns: {
          id: string;
          instance_id: string;
          user_id: string;
          kind: string;
          status: string;
          attempts: number;
          max_attempts: number;
          priority: number;
          available_at: string;
          created_at: string;
          updated_at: string;
          lease_until: string | null;
          worker_id: string | null;
          last_error: string | null;
        }[];
      };
      heartbeat_lab_job: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_lease_seconds?: number;
          p_now?: string;
        };
        Returns: {
          id: string;
          instance_id: string;
          user_id: string;
          kind: string;
          status: string;
          attempts: number;
          max_attempts: number;
          priority: number;
          available_at: string;
          created_at: string;
          updated_at: string;
          lease_until: string | null;
          worker_id: string | null;
          last_error: string | null;
        }[];
      };
      complete_lab_job: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_now?: string;
        };
        Returns: {
          id: string;
          instance_id: string;
          user_id: string;
          kind: string;
          status: string;
          attempts: number;
          max_attempts: number;
          priority: number;
          available_at: string;
          created_at: string;
          updated_at: string;
          lease_until: string | null;
          worker_id: string | null;
          last_error: string | null;
        }[];
      };
      fail_lab_job: {
        Args: {
          p_job_id: string;
          p_worker_id: string;
          p_error: string;
          p_retry_base_seconds?: number;
          p_retry_max_seconds?: number;
          p_now?: string;
        };
        Returns: {
          id: string;
          instance_id: string;
          user_id: string;
          kind: string;
          status: string;
          attempts: number;
          max_attempts: number;
          priority: number;
          available_at: string;
          created_at: string;
          updated_at: string;
          lease_until: string | null;
          worker_id: string | null;
          last_error: string | null;
        }[];
      };
      recover_expired_lab_jobs: {
        Args: {
          p_now?: string;
          p_retry_base_seconds?: number;
        };
        Returns: number;
      };
      claim_lab_instance_lease: {
        Args: {
          p_instance_id: string;
          p_user_id: string;
          p_lease_token_hash: string;
          p_lease_seconds?: number;
        };
        Returns: {
          id: string;
          status: string;
          lease_expires_at: string;
          last_heartbeat_at: string;
        }[];
      };
      heartbeat_lab_instance_lease: {
        Args: {
          p_instance_id: string;
          p_user_id: string;
          p_lease_token_hash: string;
          p_lease_seconds?: number;
        };
        Returns: {
          id: string;
          status: string;
          lease_expires_at: string;
          last_heartbeat_at: string;
        }[];
      };
      release_lab_instance_lease: {
        Args: {
          p_instance_id: string;
          p_user_id: string;
          p_lease_token_hash: string;
        };
        Returns: boolean;
      };
      claim_next_lab_control_operation: {
        Args: { p_worker_id: string; p_lease_seconds?: number };
        Returns: Database["public"]["Tables"]["lab_control_operations"]["Row"][];
      };
      heartbeat_lab_control_operation: {
        Args: { p_operation_id: string; p_worker_id: string; p_lease_seconds?: number };
        Returns: Database["public"]["Tables"]["lab_control_operations"]["Row"][];
      };
      recover_expired_lab_control_operations: {
        Args: { p_now?: string; p_limit?: number };
        Returns: Database["public"]["Tables"]["lab_control_operations"]["Row"][];
      };
      v45_revoke_runtime_identity: {
        Args: { p_runtime_id: string; p_reason?: string };
        Returns: undefined;
      };
      v45_quarantine_runtime_identity: { Args: { p_runtime_id: string }; Returns: undefined };
      v49_ensure_runtime_identity: {
        Args: {
          p_instance_id: string;
          p_binding_generation: number;
          p_ttl_ms?: number;
          p_now?: string;
        };
        Returns: Database["public"]["Tables"]["lab_runtime_identities"]["Row"][];
      };
      v49_persist_isolation_verification: {
        Args: {
          p_verification_id: string;
          p_runtime_id: string;
          p_instance_id: string;
          p_lab_id: string;
          p_user_id: string;
          p_binding_generation: number;
          p_state: string;
          p_checks: Json;
          p_reason: string;
          p_checked_at: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      linux_comfort_level: "Total beginner" | "Some terminal time" | "Comfortable, want depth";
      tutor_language: "English" | "Hinglish" | "Mix both";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      linux_comfort_level: ["Total beginner", "Some terminal time", "Comfortable, want depth"],
      tutor_language: ["English", "Hinglish", "Mix both"],
    },
  },
} as const;
