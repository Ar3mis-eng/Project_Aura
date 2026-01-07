<?php

namespace App\Http\Controllers;

use App\Models\Thread;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ThreadController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $threads = Thread::whereHas('participants', function($q) use ($user) {
            $q->where('users.id', $user->id);
        })->with(['participants:id,first_name,last_name', 'messages' => function($q){ $q->latest()->limit(1); }])
        ->orderByDesc('updated_at')
        ->get()
        ->map(function($thread) use ($user) {
            // Count unread messages in this thread for the current user
            $unreadCount = \App\Models\Message::where('thread_id', $thread->id)
                ->where('from_user_id', '!=', $user->id) // Don't count own messages
                ->whereDoesntHave('reads', function($q) use ($user) {
                    $q->where('user_id', $user->id);
                })
                ->count();
            
            $thread->unread_count = $unreadCount;
            return $thread;
        });
        
        return response()->json(['data' => $threads]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'subject' => 'required|string|max:255',
            'participant_ids' => 'required|array|min:1',
            'participant_ids.*' => 'integer|exists:users,id',
        ]);

        $thread = DB::transaction(function () use ($user, $data) {
            $t = Thread::create([
                'subject' => $data['subject'],
                'created_by' => $user->id,
            ]);
            $ids = array_values(array_unique(array_merge($data['participant_ids'], [$user->id])));
            $t->participants()->sync($ids);
            return $t;
        });

        return response()->json($thread->load('participants:id,first_name,last_name'), 201);
    }

    public function show(Request $request, $id)
    {
        $thread = Thread::with(['participants:id,first_name,last_name'])->findOrFail($id);
        $user = $request->user();
        if (!$thread->participants->pluck('id')->contains($user->id)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return response()->json($thread);
    }
}
