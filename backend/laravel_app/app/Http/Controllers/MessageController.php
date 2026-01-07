<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\Thread;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index(Request $request, $threadId)
    {
        $thread = Thread::with('participants:id')->findOrFail($threadId);
        $user = $request->user();
        if (!$thread->participants->pluck('id')->contains($user->id)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        
        $messages = Message::where('thread_id', $thread->id)
            ->with(['from:id,first_name,last_name', 'reads'])
            ->orderBy('created_at')
            ->paginate(50);
        
        // Mark all messages as read by this user
        foreach ($messages as $message) {
            if ($message->from_user_id != $user->id) {
                $message->markAsReadBy($user->id);
            }
        }
        
        // Add is_read flag for frontend
        $messages->getCollection()->transform(function($message) use ($user) {
            $message->is_read = $message->from_user_id == $user->id || $message->isReadBy($user->id);
            return $message;
        });
        
        return response()->json($messages);
    }

    public function store(Request $request, $threadId)
    {
        $thread = Thread::with('participants:id')->findOrFail($threadId);
        $user = $request->user();
        if (!$thread->participants->pluck('id')->contains($user->id)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'body' => 'required|string'
        ]);

        $msg = Message::create([
            'thread_id' => $thread->id,
            'from_user_id' => $user->id,
            'body' => $data['body'],
        ]);

        return response()->json($msg->load('from:id,first_name,last_name'), 201);
    }
}
