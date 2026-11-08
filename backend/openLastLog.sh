#!/usr/bin/env bash

clear && tail -f ~/homebrew/logs/decky-nutstore/"$(ls -Art ~/homebrew/logs/decky-nutstore | tail -n 1)"
