<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'thread_id','from_user_id','body'
    ];

    public function thread()
    {
        return $this->belongsTo(Thread::class);
    }

    public function from()
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }
}
